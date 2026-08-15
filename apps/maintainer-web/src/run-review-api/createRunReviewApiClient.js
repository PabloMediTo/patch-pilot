import { Buffer } from "node:buffer";
import { request as sendHttpRequest } from "node:http";
import { request as sendHttpsRequest } from "node:https";
import { URL } from "node:url";

const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

/**
 * Creates the server-side client for authenticated review evidence.
 *
 * @param {{ apiOrigin: string, maxResponseBytes?: number }} input API connection policy.
 * @returns {{ loadRunReviewAccess: Function }} Immutable review API port.
 */
export function createRunReviewApiClient(input) {
  const apiOrigin = parseApiOrigin(input?.apiOrigin);
  const maxResponseBytes = input?.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  if (!Number.isSafeInteger(maxResponseBytes) || maxResponseBytes < 1) throw new Error("Review API response limit must be a positive integer.");
  return Object.freeze({
    loadRunReviewAccess: (request) => loadRunReviewAccess(request, { apiOrigin, maxResponseBytes }),
  });
}

/** Loads one authorized evidence response from the control-plane API. */
async function loadRunReviewAccess(input, policy) {
  if (typeof input?.runId !== "string" || typeof input?.request !== "object") throw new Error("Review API access requires run identity and browser request.");
  const target = new URL(`/runs/${encodeURIComponent(input.runId)}/review-evidence`, policy.apiOrigin);
  const response = await openRequest(target, selectCredentialHeaders(input.request.headers));
  const body = await readBoundedBody(response, policy.maxResponseBytes);
  if (response.statusCode === 401) return Object.freeze({ status: "unauthorized" });
  if (response.statusCode === 404) return Object.freeze({ status: "missing" });
  if (response.statusCode !== 200) throw new Error(`Review API returned status ${response.statusCode}.`);
  return Object.freeze({ status: "available", evidence: parseEvidence(body) });
}

/** Validates one HTTP or HTTPS API origin. */
function parseApiOrigin(candidate) {
  const origin = new URL(candidate);
  if (origin.protocol !== "http:" && origin.protocol !== "https:") throw new Error("Review API origin must use HTTP or HTTPS.");
  return origin;
}

/** Forwards only credentials required for API-owned access decisions. */
function selectCredentialHeaders(headers = {}) {
  const selected = {};
  if (typeof headers.authorization === "string") selected.authorization = headers.authorization;
  if (typeof headers.cookie === "string") selected.cookie = headers.cookie;
  return selected;
}

/** Opens one finite API evidence request. */
function openRequest(target, headers) {
  return new Promise((resolve, reject) => {
    const sendRequest = target.protocol === "https:" ? sendHttpsRequest : sendHttpRequest;
    const outgoing = sendRequest(target, { method: "GET", headers }, resolve);
    outgoing.once("error", reject);
    outgoing.end();
  });
}

/** Reads a bounded response body without trusting API content length. */
async function readBoundedBody(response, maxResponseBytes) {
  const chunks = [];
  let byteCount = 0;
  for await (const chunk of response) {
    byteCount += chunk.length;
    if (byteCount > maxResponseBytes) throw new Error("Review API response exceeded the configured limit.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** Parses a JSON object as persisted review evidence. */
function parseEvidence(body) {
  try {
    const evidence = JSON.parse(body);
    if (evidence === null || typeof evidence !== "object" || Array.isArray(evidence)) throw new Error("not an object");
    return evidence;
  } catch (error) {
    throw new Error("Review API returned invalid evidence JSON.", { cause: error });
  }
}
