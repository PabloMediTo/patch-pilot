import { Buffer } from "node:buffer";
import { createPrivateKey, sign } from "node:crypto";
import { clearTimeout, setTimeout } from "node:timers";
import { URL } from "node:url";

const DEFAULT_API_BASE = "https://api.github.com/";
const DEFAULT_API_VERSION = "2026-03-10";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RESPONSE_BYTES = 1_048_576;
const TOKEN_REFRESH_SKEW_MS = 60_000;
const REPOSITORY_PATH = /^\/repos\/([^/]+)\/([^/]+)\//u;

/**
 * Creates a bounded GitHub REST request port authenticated as one app installation.
 *
 * @param {{ appId: string | number, privateKey: string, fetchImpl?: Function, clock?: Function, apiBaseUrl?: string, apiVersion?: string, timeoutMs?: number, maxResponseBytes?: number }} options App credentials and transport policy.
 * @returns {Function} Authenticated repository-scoped GitHub request function.
 */
export function createGitHubAppRequest(options) {
  const state = Object.freeze({ config: createConfig(options), tokens: new Map(), pending: new Map() });
  return async function requestGitHub(request) {
    const target = createRequestTarget(state.config, request);
    const token = await getInstallationToken(state, request.installationId, target.repositoryName);
    return sendRepositoryRequest(state.config, { request, url: target.url, token });
  };
}

/** Validates immutable credentials, limits, and API origin. */
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
    throw new Error("GitHub App transport requires credentials, HTTPS, and positive limits.");
  }
  apiBaseUrl.search = "";
  apiBaseUrl.hash = "";
  if (!apiBaseUrl.pathname.endsWith("/")) apiBaseUrl.pathname += "/";
  return Object.freeze({ appId: String(options.appId), privateKey: createPrivateKey(options.privateKey),
    fetchImpl, clock, apiBaseUrl, apiVersion: options.apiVersion ?? DEFAULT_API_VERSION,
    timeoutMs, maxResponseBytes });
}

/** Resolves and validates one repository-only API request target. */
function createRequestTarget(config, request) {
  const match = REPOSITORY_PATH.exec(request?.path);
  const isAllowedMethod = ["GET", "POST"].includes(request?.method);
  if (!Number.isInteger(request?.installationId) || request.installationId <= 0
    || match === null || !isAllowedMethod) {
    throw new Error("GitHub App transport accepts only installation repository GET or POST requests.");
  }
  const repositoryName = decodeRepositoryName(match[2]);
  const url = new URL(request.path.slice(1), config.apiBaseUrl);
  appendQuery(url, request.query);
  return Object.freeze({ repositoryName, url });
}

/** Rejects an encoded repository name that changes the route boundary. */
function decodeRepositoryName(encodedName) {
  let repositoryName;
  try { repositoryName = decodeURIComponent(encodedName); }
  catch { throw new Error("GitHub repository route contains invalid encoding."); }
  if (repositoryName.trim() === "" || repositoryName.includes("/")) {
    throw new Error("GitHub repository route contains an invalid name.");
  }
  return repositoryName;
}

/** Adds scalar query values without string-built URLs. */
function appendQuery(url, query) {
  if (query === undefined) return;
  if (query === null || typeof query !== "object" || Array.isArray(query)) {
    throw new Error("GitHub query must be a key-value object.");
  }
  for (const [key, value] of Object.entries(query)) {
    if (!["string", "number", "boolean"].includes(typeof value)) {
      throw new Error("GitHub query values must be scalar.");
    }
    url.searchParams.set(key, String(value));
  }
}

/** Returns a cached installation token or coalesces one refresh. */
async function getInstallationToken(state, installationId, repositoryName) {
  const key = `${installationId}:${repositoryName.toLowerCase()}`;
  const cached = state.tokens.get(key);
  if (cached !== undefined && cached.expiresAtMs - TOKEN_REFRESH_SKEW_MS > readClock(state.config)) {
    return cached.token;
  }
  const inFlight = state.pending.get(key);
  if (inFlight !== undefined) return inFlight;
  const promise = createInstallationToken(state.config, installationId, repositoryName)
    .then((token) => { state.tokens.set(key, token); return token.token; })
    .finally(() => state.pending.delete(key));
  state.pending.set(key, promise);
  return promise;
}

/** Exchanges an app JWT for one least-privilege repository token. */
async function createInstallationToken(config, installationId, repositoryName) {
  const response = await fetchBounded(config,
    new URL(`app/installations/${installationId}/access_tokens`, config.apiBaseUrl),
    Object.freeze({ method: "POST", headers: createHeaders(config, createAppJwt(config)),
      body: JSON.stringify({ repositories: [repositoryName],
        permissions: { contents: "write", pull_requests: "write" } }) }));
  if (response.statusCode !== 201 || typeof response.body?.token !== "string"
    || response.body.token.trim() === "") {
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
  const payload = encodeJwtPart({ iat: nowSeconds - 60, exp: nowSeconds + 540, iss: config.appId });
  const signingInput = `${header}.${payload}`;
  const signature = sign("RSA-SHA256", Buffer.from(signingInput, "utf8"), config.privateKey)
    .toString("base64url");
  return `${signingInput}.${signature}`;
}

/** Encodes one compact JWT JSON section. */
function encodeJwtPart(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

/** Sends one repository request with an installation token. */
function sendRepositoryRequest(config, input) {
  const { request, url, token } = input;
  const init = { method: request.method, headers: createHeaders(config, token) };
  if (request.body !== undefined) init.body = JSON.stringify(request.body);
  return fetchBounded(config, url, Object.freeze(init));
}

/** Creates stable versioned JSON headers without logging credentials. */
function createHeaders(config, token) {
  return Object.freeze({ accept: "application/vnd.github+json", authorization: `Bearer ${token}`,
    "content-type": "application/json", "user-agent": "patch-pilot",
    "x-github-api-version": config.apiVersion });
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
  const text = bytes.toString("utf8");
  return text === "" ? null : JSON.parse(text);
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
    throw new Error("GitHub App transport clock must return a valid Date.");
  }
  return instant.valueOf();
}
