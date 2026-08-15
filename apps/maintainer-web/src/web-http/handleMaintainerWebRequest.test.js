import assert from "node:assert/strict";

import { handleMaintainerWebRequest } from "./index.js";

const asset = createInput({ url: "/assets/run-review-live.js" });
assert.equal((await handleMaintainerWebRequest(asset)).status, "served");
assert.equal(asset.forwarded.length, 0);

const style = createInput({ url: "/assets/run-review.css" });
assert.equal((await handleMaintainerWebRequest(style)).status, "served");
assert.equal(style.response.headers["content-type"], "text/css; charset=utf-8");
assert.equal(style.forwarded.length, 0);

const review = createInput({ url: "/runs/run-1/review" });
assert.equal((await handleMaintainerWebRequest(review)).status, "rendered");
assert.equal(review.response.code, 200);
assert.equal(review.forwarded.length, 0);

for (const url of ["/runs/run-1/timeline", "/runs/run-1/approval/approve", "/runs/run-1/approval/reject"]) {
  const api = createInput({ method: "POST", url });
  assert.equal((await handleMaintainerWebRequest(api)).status, "forwarded");
  assert.equal(api.forwarded[0].request, api.request);
  assert.equal(api.forwarded[0].response, api.response);
}

const missing = createInput({ url: "/unknown" });
assert.equal((await handleMaintainerWebRequest(missing)).status, "not-found");
assert.equal(missing.response.code, 404);

/** Creates one complete dispatcher fixture. */
function createInput(overrides = {}) {
  const forwarded = [];
  return {
    request: { method: overrides.method ?? "GET", url: overrides.url ?? "/" },
    response: createResponse(), forwarded,
    loadRunReviewAccess: async () => ({ status: "available", evidence: createEvidence() }),
    forwardApiRequest: async (exchange) => { forwarded.push(exchange); },
  };
}

/** Creates enough persisted evidence to render a review. */
function createEvidence() {
  return {
    run: { id: "run-1", status: "awaiting-approval" }, timeline: [],
    proposal: { plan: { steps: [{ path: "src/fix.ts", description: "Fix" }] }, diff: "+safe" },
    verification: { status: "passed", evidence: { command: { executable: "npm", args: ["test"] },
      exitCode: 0, stdout: "ok", stderr: "", durationMs: 1, hasTimedOut: false, hasTruncatedOutput: false } },
  };
}

/** Creates a Node-compatible response fixture. */
function createResponse() {
  return { writeHead(code, headers) { this.code = code; this.headers = headers; }, end(body) { this.body = body; } };
}
