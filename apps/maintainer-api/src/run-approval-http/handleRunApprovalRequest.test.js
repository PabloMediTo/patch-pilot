import assert from "node:assert/strict";
import { handleRunApprovalRequest } from "./index.js";

assert.equal((await handleRunApprovalRequest(createInput({ url: "/health" }))).status, "unhandled");
assert.equal((await handleRunApprovalRequest(createInput({ authenticateRequest: async () => null }))).statusCode, 401);
assert.equal((await handleRunApprovalRequest(createInput({ headers: {} }))).statusCode, 400);
let saved;
const approved = await handleRunApprovalRequest(createInput({
  saveFirstDecision: async (decision) => { saved = decision; return { status: "created", decision }; },
}));
assert.equal(approved.statusCode, 201);
assert.equal(saved.status, "approved");
assert.equal(saved.actorId, "reviewer-1");
const rejected = await handleRunApprovalRequest(createInput({
  url: "/runs/run-1/approval/reject", body: { reason: "Regression risk" },
  saveFirstDecision: async (decision) => ({ status: "created", decision }),
}));
assert.equal(rejected.body.decision.reason, "Regression risk");
assert.equal((await handleRunApprovalRequest(createInput({ runStatus: "verifying" }))).statusCode, 409);

/** Creates one approval handler fixture. */
function createInput(overrides = {}) {
  return {
    request: { method: overrides.method ?? "POST", url: overrides.url ?? "/runs/run-1/approval/approve",
      headers: overrides.headers ?? { "idempotency-key": "request-1" } },
    response: { writeHead(code, headers) { this.code = code; this.headers = headers; }, end(body) { this.body = body; } },
    authenticateRequest: overrides.authenticateRequest ?? (async () => ({ id: "reviewer-1" })),
    readRequestBody: async () => overrides.body ?? {},
    loadApprovalState: async () => ({ runStatus: overrides.runStatus ?? "awaiting-approval", decision: null,
      reviewBinding: { baseRevision: "a".repeat(40), diffHash: "b".repeat(64), planVersion: 1,
        verification: { status: "passed", evidenceHash: "c".repeat(64) } } }),
    saveFirstDecision: overrides.saveFirstDecision ?? (async (decision) => ({ status: "created", decision })),
    clock: () => new Date("2026-08-14T12:00:00.000Z"),
  };
}
