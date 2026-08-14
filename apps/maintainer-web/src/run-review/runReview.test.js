import assert from "node:assert/strict";

import { createRunReview, renderRunReviewHtml } from "./index.js";

const input = {
  run: { id: "run-1", status: "awaiting-approval" },
  timeline: [
    { sequence: 1, type: "submitted", occurredAt: "2026-08-14T10:00:00.000Z" },
    { sequence: 2, type: "verified", occurredAt: "2026-08-14T10:01:00.000Z" },
  ],
  proposal: {
    plan: { steps: [{ path: "src/fix.ts", description: "Handle <unsafe> input" }] },
    diff: "--- a/src/fix.ts\n+++ b/src/fix.ts\n-old\n+new <script>alert(1)</script>",
  },
  verification: {
    status: "passed",
    evidence: {
      command: { executable: "npm", args: ["test"] },
      exitCode: 0,
      stdout: "42 tests passed",
      stderr: "",
      durationMs: 125,
      hasTimedOut: false,
      hasTruncatedOutput: false,
    },
  },
};

const review = createRunReview(input);
assert.deepEqual(review.diff.map(({ kind }) => kind), ["context", "context", "deletion", "addition"]);
assert.equal(review.actions.approve, "/runs/run-1/approval/approve");
assert.equal(review.actions.reject, "/runs/run-1/approval/reject");
assert.equal(Object.isFrozen(review.timeline), true);

const html = renderRunReviewHtml(review);
assert.match(html, /Timeline/u);
assert.match(html, /42 tests passed/u);
assert.match(html, /class="addition"/u);
assert.match(html, /Handle &lt;unsafe&gt; input/u);
assert.doesNotMatch(html, /<script>/u);
assert.match(html, /<button>Approve<\/button>/u);

const decided = createRunReview({ ...input, approval: { status: "rejected", reason: "Too broad" } });
assert.equal(decided.actions.approve, null);
assert.doesNotMatch(renderRunReviewHtml(decided), /<button>Approve<\/button>/u);

const running = createRunReview({ ...input, run: { id: "run-2", status: "verifying" } });
assert.equal(running.actions.reject, null);
assert.match(renderRunReviewHtml(running), /not available/u);

assert.throws(() => createRunReview({}), /requires run/u);
