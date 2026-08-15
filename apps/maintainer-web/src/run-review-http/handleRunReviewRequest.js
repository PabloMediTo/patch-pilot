import { URL } from "node:url";

import { createRunReview, renderRunReviewHtml } from "../run-review/index.js";

const ROUTE_PATTERN = /^\/runs\/([^/]+)\/review$/u;

/**
 * Handles authenticated loading and rendering of one run review.
 *
 * @param {{ request: object, response: object, loadRunReviewAccess: Function }} input HTTP and review ports.
 * @returns {Promise<object>} Route outcome.
 */
export async function handleRunReviewRequest(input) {
  assertPorts(input);
  const runId = parseRunId(input.request.url);
  if (runId === null) return Object.freeze({ status: "unhandled" });
  if (input.request.method !== "GET") return writeText(input.response, 405, { body: "Method not allowed", headers: { allow: "GET" } });
  const access = await input.loadRunReviewAccess(Object.freeze({ runId, request: input.request }));
  if (access.status === "unauthorized") return writeText(input.response, 401, { body: "Unauthorized" });
  if (access.status === "missing") return writeText(input.response, 404, { body: "Review not found" });
  if (access.status !== "available") throw new Error("Review access port returned an unknown status.");
  const html = renderRunReviewHtml(createRunReview(access.evidence));
  input.response.writeHead(200, reviewHeaders());
  input.response.end(html);
  return Object.freeze({ status: "rendered", runId });
}

/** Validates required integration ports. */
function assertPorts(input) {
  if (typeof input?.request?.url !== "string" || typeof input?.request?.method !== "string"
    || typeof input?.response?.writeHead !== "function" || typeof input.response.end !== "function"
    || typeof input?.loadRunReviewAccess !== "function") {
    throw new Error("Review HTTP handler requires request, response, and review access port.");
  }
}

/** Parses and decodes the supported review route. */
function parseRunId(requestUrl) {
  const match = ROUTE_PATTERN.exec(new URL(requestUrl, "http://patch-pilot.local").pathname);
  if (match === null) return null;
  try { const runId = decodeURIComponent(match[1]); return runId.trim() === "" ? null : runId; }
  catch { return null; }
}

/** Returns restrictive headers for untrusted review content. */
function reviewHeaders() {
  return Object.freeze({
    "content-type": "text/html; charset=utf-8",
    "content-security-policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    "x-content-type-options": "nosniff",
  });
}

/** Writes a terminal plain-text rejection. */
function writeText(response, statusCode, output) {
  response.writeHead(statusCode, { "content-type": "text/plain; charset=utf-8", ...output.headers });
  response.end(output.body);
  return Object.freeze({ status: "rejected", statusCode });
}
