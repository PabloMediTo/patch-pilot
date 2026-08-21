import { Buffer } from "node:buffer";
import { createPrivateKey, sign } from "node:crypto";
import { clearTimeout, setTimeout } from "node:timers";
import { URL } from "node:url";

const DEFAULT_API_BASE = "https://api.github.com/";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RESPONSE_BYTES = 1_048_576;
const TOKEN_REFRESH_SKEW_MS = 60_000;
const MAX_TOKEN_BYTES = 8192;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;
const PERMISSION_NAMES = new Set(["contents", "pull_requests"]);

/**
 * Creates a cached provider for repository-scoped GitHub App installation tokens.
 *
 * @param {{ appId: string | number, privateKey: string, permissions: object, fetchImpl?: Function, clock?: Function, apiBaseUrl?: string, timeoutMs?: number, maxResponseBytes?: number }} options App credentials and exact token policy.
 * @returns {Function} Installation-token provider.
 */
export function createGitHubInstallationTokenProvider(options) {
  const config = createConfig(options);
  const state = Object.freeze({ config, tokens: new Map(), pending: new Map() });
  return async function getInstallationToken(input) {
    const target = createTokenTarget(input);
    const key = `${target.installationId}:${target.repository.toLowerCase()}`;
    const cached = state.tokens.get(key);
    if (isTokenUsable(cached, config)) return cached.token;
    const inFlight = state.pending.get(key);
    if (inFlight !== undefined) return inFlight;
    const promise = requestInstallationToken(config, target)
      .then((token) => { state.tokens.set(key, token); return token.token; })
      .finally(() => state.pending.delete(key));
    state.pending.set(key, promise);
    return promise;
  };
}

/** Validates immutable credentials, permissions, limits, and API origin. */
function createConfig(options) {
  const apiBaseUrl = new URL(options?.apiBaseUrl ?? DEFAULT_API_BASE);
  const fetchImpl = options?.fetchImpl ?? globalThis.fetch;
  const clock = options?.clock ?? (() => new Date());
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxResponseBytes = options?.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  const hasAppId = (typeof options?.appId === "string" && options.appId.trim() !== "")
    || (Number.isInteger(options?.appId) && options.appId > 0);
  if (!hasAppId || typeof options?.privateKey !== "string" || apiBaseUrl.protocol !== "https:"
    || typeof fetchImpl !== "function" || typeof clock !== "function"
    || !Number.isInteger(timeoutMs) || timeoutMs <= 0
    || !Number.isInteger(maxResponseBytes) || maxResponseBytes <= 0) {
    throw new Error("GitHub installation tokens require credentials, HTTPS, and positive limits.");
  }
  apiBaseUrl.search = "";
  apiBaseUrl.hash = "";
  if (!apiBaseUrl.pathname.endsWith("/")) apiBaseUrl.pathname += "/";
  return Object.freeze({ appId: String(options.appId), privateKey: createPrivateKey(options.privateKey),
    permissions: createPermissions(options.permissions), fetchImpl, clock, apiBaseUrl,
    timeoutMs, maxResponseBytes });
}

/** Requires one explicit non-empty map of GitHub permission levels. */
function createPermissions(permissions) {
  const entries = permissions !== null && typeof permissions === "object"
    && !Array.isArray(permissions) ? Object.entries(permissions) : [];
  const hasInvalidEntry = entries.length === 0 || entries.some(([name, level]) =>
    !PERMISSION_NAMES.has(name) || !["read", "write"].includes(level));
  if (hasInvalidEntry) {
    throw new Error("GitHub installation tokens require explicit read or write permissions.");
  }
  return Object.freeze(Object.fromEntries(entries));
}

/** Validates and splits one installation repository identity. */
function createTokenTarget(input) {
  if (!Number.isInteger(input?.installationId) || input.installationId <= 0
    || !REPOSITORY.test(input?.repository)) {
    throw new Error("GitHub installation token requires an installation and repository.");
  }
  return Object.freeze({ installationId: input.installationId, repository: input.repository,
    repositoryName: input.repository.split("/")[1] });
}

/** Reports whether a cached token remains outside the refresh window. */
function isTokenUsable(token, config) {
  return token !== undefined && token.expiresAtMs - TOKEN_REFRESH_SKEW_MS > readClock(config);
}

/** Exchanges an app JWT for one least-privilege repository token. */
async function requestInstallationToken(config, target) {
  const response = await fetchBounded(config,
    new URL(`app/installations/${target.installationId}/access_tokens`, config.apiBaseUrl),
    Object.freeze({ method: "POST", headers: createHeaders(createAppJwt(config)),
      body: JSON.stringify({ repositories: [target.repositoryName],
        permissions: config.permissions }) }));
  if (response.statusCode !== 201 || typeof response.body?.token !== "string"
    || response.body.token.trim() === ""
    || Buffer.byteLength(response.body.token) > MAX_TOKEN_BYTES) {
    throw new Error(`GitHub installation token request failed with status ${response.statusCode}.`);
  }
  const expiresAtMs = Date.parse(response.body.expires_at);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= readClock(config)) {
    throw new Error("GitHub installation token has an invalid expiration.");
  }
  return Object.freeze({ token: response.body.token, expiresAtMs });
}

/** Creates GitHub's required RS256 app JWT with bounded claims. */
function createAppJwt(config) {
  const nowSeconds = Math.floor(readClock(config) / 1000);
  const header = encodeJwtPart({ alg: "RS256", typ: "JWT" });
  const payload = encodeJwtPart({ iat: nowSeconds - 60, exp: nowSeconds + 540,
    iss: config.appId });
  const signingInput = `${header}.${payload}`;
  const signature = sign("RSA-SHA256", Buffer.from(signingInput, "utf8"), config.privateKey)
    .toString("base64url");
  return `${signingInput}.${signature}`;
}

/** Encodes one compact JWT JSON section. */
function encodeJwtPart(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

/** Creates stable JSON headers without exposing credentials in URLs. */
function createHeaders(token) {
  return Object.freeze({ accept: "application/vnd.github+json", authorization: `Bearer ${token}`,
    "content-type": "application/json", "user-agent": "patch-pilot" });
}

/** Executes one timed fetch and parses a bounded JSON response. */
async function fetchBounded(config, url, init) {
  const controller = new globalThis.AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await config.fetchImpl(url, Object.freeze({ ...init, signal: controller.signal }));
    const body = await readBoundedJson(response, config.maxResponseBytes);
    return Object.freeze({ statusCode: response.status, body });
  } finally {
    clearTimeout(timeout);
  }
}

/** Parses one already size-bounded provider JSON response. */
async function readBoundedJson(response, maxBytes) {
  const bytes = await readBoundedBytes(response, maxBytes);
  if (bytes === null) return null;
  const value = bytes.toString("utf8");
  return value === "" ? null : JSON.parse(value);
}

/** Reads response bytes without permitting unbounded provider output. */
async function readBoundedBytes(response, maxBytes) {
  assertDeclaredResponseLength(response, maxBytes);
  if (response.body === null) return null;
  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    totalBytes += chunk.value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new Error("GitHub response exceeds the configured byte limit.");
    }
    chunks.push(Buffer.from(chunk.value));
  }
  return Buffer.concat(chunks, totalBytes);
}

/** Rejects a declared response length before consuming its stream. */
function assertDeclaredResponseLength(response, maxBytes) {
  const declaredLength = Number(response.headers?.get?.("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error("GitHub response exceeds the configured byte limit.");
  }
}

/** Reads a valid wall-clock instant from the injected clock. */
function readClock(config) {
  const instant = config.clock();
  if (!(instant instanceof Date) || Number.isNaN(instant.valueOf())) {
    throw new Error("GitHub installation token clock must return a valid Date.");
  }
  return instant.valueOf();
}
