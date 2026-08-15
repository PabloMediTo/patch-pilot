import assert from "node:assert/strict";
import { request } from "node:http";

import { createMaintainerApiServer } from "./index.js";

let savedDecision;
const server = createMaintainerApiServer({
  reviewEvidence: { authorizeRunAccess: async () => true, loadRunReviewEvidence: async () => ({ run: { id: "run-1" } }) },
  approval: { authenticateRequest: async () => ({ id: "reviewer-1" }),
    loadApprovalState: async () => ({ runStatus: "awaiting-approval", decision: null,
      reviewBinding: { baseRevision: "a".repeat(40), diffHash: "b".repeat(64), planVersion: 1,
        verification: { status: "passed", evidenceHash: "c".repeat(64) } } }),
    saveFirstDecision: async (decision) => { savedDecision = decision; return { status: "created", decision }; },
    clock: () => new Date("2026-08-15T10:00:00.000Z") },
  timeline: { authorizeRunAccess: async () => false, store: {}, stream: {} },
});
await listen(server);

const review = await exchange(server, { method: "GET", path: "/runs/run-1/review-evidence" });
assert.equal(review.statusCode, 200);
assert.deepEqual(JSON.parse(review.body), { run: { id: "run-1" } });

const approval = await exchange(server, { method: "POST", path: "/runs/run-1/approval/reject",
  headers: { "content-type": "application/json", "idempotency-key": "request-1" }, body: '{"reason":"Regression"}' });
assert.equal(approval.statusCode, 201);
assert.equal(savedDecision.reason, "Regression");

const invalid = await exchange(server, { method: "POST", path: "/runs/run-1/approval/approve",
  headers: { "content-type": "application/json", "idempotency-key": "request-2" }, body: "{" });
assert.deepEqual(invalid, { statusCode: 400, body: '{"error":"invalid-json"}' });
assert.equal((await exchange(server, { method: "GET", path: "/unknown" })).statusCode, 404);

await close(server);

/** Starts the API server on an ephemeral loopback port. */
function listen(target) {
  return new Promise((resolve, reject) => { target.once("error", reject); target.listen(0, "127.0.0.1", resolve); });
}

/** Sends one finite HTTP exchange. */
function exchange(target, input) {
  return new Promise((resolve, reject) => {
    const outgoing = request(`${originOf(target)}${input.path}`, { method: input.method, headers: input.headers }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({ statusCode: response.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    outgoing.once("error", reject);
    outgoing.end(input.body);
  });
}

/** Returns the server's assigned loopback origin. */
function originOf(target) {
  return `http://127.0.0.1:${target.address().port}`;
}

/** Stops the listening API server. */
function close(target) {
  return new Promise((resolve, reject) => target.close((error) => error ? reject(error) : resolve()));
}
