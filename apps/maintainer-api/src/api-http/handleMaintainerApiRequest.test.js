import assert from "node:assert/strict";

import { handleMaintainerApiRequest } from "./index.js";

const review = createInput({ url: "/runs/run-1/review-evidence" });
assert.equal((await handleMaintainerApiRequest(review)).status, "served");
assert.equal(review.response.code, 200);

const approval = createInput({ method: "POST", url: "/runs/run-1/approval/approve" });
assert.equal((await handleMaintainerApiRequest(approval)).statusCode, 201);

const timeline = createInput({ url: "/runs/run-1/timeline", authorized: false });
assert.equal((await handleMaintainerApiRequest(timeline)).reason, "unauthorized");

const missing = createInput({ url: "/health" });
assert.equal((await handleMaintainerApiRequest(missing)).statusCode, 404);

/** Creates complete role ports for one dispatch. */
function createInput(overrides = {}) {
  const request = { method: overrides.method ?? "GET", url: overrides.url ?? "/", headers: { "idempotency-key": "request-1" }, on() {} };
  return {
    request, response: createResponse(),
    reviewEvidence: { authorizeRunAccess: async () => overrides.authorized ?? true, loadRunReviewEvidence: async () => ({ run: { id: "run-1" } }) },
    approval: { authenticateRequest: async () => ({ id: "reviewer-1" }), readRequestBody: async () => ({}),
      loadApprovalState: async () => ({ runStatus: "awaiting-approval", decision: null,
        reviewBinding: { baseRevision: "a".repeat(40), diffHash: "b".repeat(64), planVersion: 1,
          verification: { status: "passed", evidenceHash: "c".repeat(64) } } }),
      saveFirstDecision: async (decision) => ({ status: "created", decision }), clock: () => new Date("2026-08-15T10:00:00.000Z") },
    timeline: { authorizeRunAccess: async () => overrides.authorized ?? true, store: {}, stream: {}, scheduleHeartbeat: () => () => undefined },
  };
}

/** Creates a Node-compatible response fixture. */
function createResponse() {
  return { writeHead(code, headers) { this.code = code; this.headers = headers; }, write() {}, end(body) { this.body = body; } };
}
