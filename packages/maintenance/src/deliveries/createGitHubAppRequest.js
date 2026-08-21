import { Buffer } from "node:buffer";
import { clearTimeout, setTimeout } from "node:timers";
import { URL } from "node:url";

import { createGitHubInstallationTokenProvider } from "../github-authentication/index.js";

const DEFAULT_API_BASE = "https://api.github.com/";
const DEFAULT_API_VERSION = "2026-03-10";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RESPONSE_BYTES = 1_048_576;
const REPOSITORY_PATH = /^\/repos\/([^/]+)\/([^/]+)\//u;

/**
 * Creates a bounded GitHub REST request port authenticated as one app installation.
 *
 * @param {{ appId: string | number, privateKey: string, permissions: object, fetchImpl?: Function, clock?: Function, apiBaseUrl?: string, apiVersion?: string, timeoutMs?: number, maxResponseBytes?: number, getInstallationToken?: Function }} options App credentials, exact token permissions, and transport policy.
 * @returns {Function} Authenticated repository-scoped GitHub request function.
 */
export function createGitHubAppRequest(options) {
  const config = createConfig(options);
  const getInstallationToken = options?.getInstallationToken
    ?? createGitHubInstallationTokenProvider(options);
  return async function requestGitHub(request) {
    const target = createRequestTarget(config, request);
    const token = await getInstallationToken({ installationId: request.installationId,
      repository: target.repository });
    return sendRepositoryRequest(config, { request, url: target.url, token });
  };
}

/** Validates immutable credentials, limits, and API origin. */
function createConfig(options) {
  const apiBaseUrl = new URL(options?.apiBaseUrl ?? DEFAULT_API_BASE);
  const fetchImpl = options?.fetchImpl ?? globalThis.fetch;
  const clock = options?.clock ?? (() => new Date());
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxResponseBytes = options?.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  if (apiBaseUrl.protocol !== "https:" || typeof fetchImpl !== "function"
    || typeof clock !== "function"
    || !Number.isInteger(timeoutMs) || timeoutMs <= 0
    || !Number.isInteger(maxResponseBytes) || maxResponseBytes <= 0) {
    throw new Error("GitHub App transport requires credentials, HTTPS, and positive limits.");
  }
  apiBaseUrl.search = "";
  apiBaseUrl.hash = "";
  if (!apiBaseUrl.pathname.endsWith("/")) apiBaseUrl.pathname += "/";
  return Object.freeze({ fetchImpl, clock, apiBaseUrl,
    apiVersion: options?.apiVersion ?? DEFAULT_API_VERSION, timeoutMs, maxResponseBytes });
}

/** Resolves and validates one repository-only API request target. */
function createRequestTarget(config, request) {
  const match = REPOSITORY_PATH.exec(request?.path);
  const isAllowedMethod = ["GET", "POST"].includes(request?.method);
  if (!Number.isInteger(request?.installationId) || request.installationId <= 0
    || match === null || !isAllowedMethod) {
    throw new Error("GitHub App transport accepts only installation repository GET or POST requests.");
  }
  const repositoryOwner = decodeRepositoryPart(match[1]);
  const repositoryName = decodeRepositoryPart(match[2]);
  const url = new URL(request.path.slice(1), config.apiBaseUrl);
  appendQuery(url, request.query);
  return Object.freeze({ repository: `${repositoryOwner}/${repositoryName}`, url });
}

/** Rejects an encoded repository part that changes the route boundary. */
function decodeRepositoryPart(encodedPart) {
  let repositoryPart;
  try { repositoryPart = decodeURIComponent(encodedPart); }
  catch { throw new Error("GitHub repository route contains invalid encoding."); }
  if (repositoryPart.trim() === "" || repositoryPart.includes("/")) {
    throw new Error("GitHub repository route contains an invalid name.");
  }
  return repositoryPart;
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
