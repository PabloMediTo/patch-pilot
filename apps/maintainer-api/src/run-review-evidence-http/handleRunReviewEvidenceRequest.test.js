import assert from "node:assert/strict";

import { handleRunReviewEvidenceRequest } from "./index.js";

assert.equal((await handleRunReviewEvidenceRequest(createInput({ url: "/health" }))).status, "unhandled");
assert.equal((await handleRunReviewEvidenceRequest(createInput({ method: "POST" }))).statusCode, 405);
assert.equal((await handleRunReviewEvidenceRequest(createInput({ authorized: false }))).statusCode, 401);
assert.equal((await handleRunReviewEvidenceRequest(createInput({ evidence: null }))).statusCode, 404);

let authorizedRunId;
const response = createResponse();
const served = await handleRunReviewEvidenceRequest(createInput({
  url: "/runs/run%20private/review-evidence", response,
  authorizeRunAccess: async ({ runId }) => { authorizedRunId = runId; return true; },
}));
assert.equal(served.status, "served");
assert.equal(authorizedRunId, "run private");
assert.equal(response.headers["cache-control"], "no-store");
assert.deepEqual(JSON.parse(response.body), createEvidence());

/** Creates one complete handler fixture. */
function createInput(overrides = {}) {
  return {
    request: { method: overrides.method ?? "GET", url: overrides.url ?? "/runs/run-1/review-evidence" },
    response: overrides.response ?? createResponse(),
    authorizeRunAccess: overrides.authorizeRunAccess ?? (async () => overrides.authorized ?? true),
    loadRunReviewEvidence: async () => overrides.evidence === undefined ? createEvidence() : overrides.evidence,
  };
}

/** Creates representative persisted evidence. */
function createEvidence() {
  return { run: { id: "run-1", status: "awaiting-approval" }, timeline: [], proposal: { plan: { steps: [] }, diff: "" }, verification: null };
}

/** Creates a Node-compatible response fixture. */
function createResponse() {
  return { writeHead(code, headers) { this.code = code; this.headers = headers; }, end(body) { this.body = body; } };
}
