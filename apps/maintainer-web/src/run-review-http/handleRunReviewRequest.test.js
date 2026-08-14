import assert from "node:assert/strict";

import { handleRunReviewRequest } from "./index.js";

assert.equal((await handleRunReviewRequest(createInput({ url: "/health" }))).status, "unhandled");
assert.equal((await handleRunReviewRequest(createInput({ authorizeRunAccess: async () => false }))).statusCode, 401);
assert.equal((await handleRunReviewRequest(createInput({ evidence: null }))).statusCode, 404);

let authorizedRunId;
const response = createResponse();
const rendered = await handleRunReviewRequest(createInput({
  response,
  url: "/runs/run%20private/review",
  authorizeRunAccess: async ({ runId }) => { authorizedRunId = runId; return true; },
}));
assert.equal(rendered.status, "rendered");
assert.equal(authorizedRunId, "run private");
assert.equal(response.code, 200);
assert.match(response.headers["content-security-policy"], /default-src 'none'/u);
assert.match(response.headers["content-security-policy"], /style-src 'self'/u);
assert.match(response.body, /&lt;unsafe&gt;/u);
assert.doesNotMatch(response.body, /<unsafe>/u);

/** Creates one handler fixture. */
function createInput(overrides = {}) {
  return {
    request: { method: overrides.method ?? "GET", url: overrides.url ?? "/runs/run-1/review" },
    response: overrides.response ?? createResponse(),
    authorizeRunAccess: overrides.authorizeRunAccess ?? (async () => true),
    loadRunReviewEvidence: async () => overrides.evidence === undefined ? createEvidence() : overrides.evidence,
  };
}

/** Creates complete persisted review evidence. */
function createEvidence() {
  return {
    run: { id: "run-1", status: "awaiting-approval" }, timeline: [],
    proposal: { plan: { steps: [{ path: "src/fix.ts", description: "Fix <unsafe>" }] }, diff: "+safe" },
    verification: { status: "passed", evidence: { command: { executable: "npm", args: ["test"] },
      exitCode: 0, stdout: "ok", stderr: "", durationMs: 1, hasTimedOut: false, hasTruncatedOutput: false } },
  };
}

/** Creates a Node-compatible response fixture. */
function createResponse() {
  return { writeHead(code, headers) { this.code = code; this.headers = headers; }, end(body) { this.body = body; } };
}
