import { URL } from "node:url";

const ROUTE_PATTERN = /^\/runs\/([^/]+)\/review-evidence$/u;

/**
 * Serves authenticated persisted evidence for one run review.
 *
 * @param {{ request: object, response: object, authorizeRunAccess: Function, loadRunReviewEvidence: Function }} input HTTP and evidence ports.
 * @returns {Promise<object>} Route outcome.
 */
export async function handleRunReviewEvidenceRequest(input) {
  assertPorts(input);
  const runId = parseRunId(input.request.url);
  if (runId === null) return Object.freeze({ status: "unhandled" });
  if (input.request.method !== "GET") return writeJson(input.response, { statusCode: 405, body: { error: "method-not-allowed" }, headers: { allow: "GET" } });
  const hasAccess = await input.authorizeRunAccess(Object.freeze({ runId, request: input.request }));
  if (!hasAccess) return writeJson(input.response, { statusCode: 401, body: { error: "unauthorized" } });
  const evidence = await input.loadRunReviewEvidence(runId);
  if (evidence === null) return writeJson(input.response, { statusCode: 404, body: { error: "review-not-found" } });
  return writeJson(input.response, { statusCode: 200, body: evidence });
}

/** Validates the handler integration ports. */
function assertPorts(input) {
  if (typeof input?.request?.url !== "string" || typeof input?.request?.method !== "string"
    || typeof input?.response?.writeHead !== "function" || typeof input.response.end !== "function"
    || typeof input?.authorizeRunAccess !== "function" || typeof input?.loadRunReviewEvidence !== "function") {
    throw new Error("Review evidence HTTP handler requires request, response, authorization, and evidence ports.");
  }
}

/** Parses one non-empty encoded run identity. */
function parseRunId(requestUrl) {
  const match = ROUTE_PATTERN.exec(new URL(requestUrl, "http://patch-pilot.local").pathname);
  if (match === null) return null;
  try { const runId = decodeURIComponent(match[1]); return runId.trim() === "" ? null : runId; }
  catch { return null; }
}

/** Writes one terminal JSON response. */
function writeJson(response, output) {
  response.writeHead(output.statusCode, {
    "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...output.headers,
  });
  response.end(JSON.stringify(output.body));
  return Object.freeze({ status: output.statusCode < 400 ? "served" : "rejected", statusCode: output.statusCode });
}
