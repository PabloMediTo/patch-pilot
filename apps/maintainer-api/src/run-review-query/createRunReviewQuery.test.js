import assert from "node:assert/strict";

import { createRunReviewQuery } from "./index.js";

const reviewBinding = Object.freeze({
  baseRevision: "a".repeat(40),
  diffHash: "b".repeat(64),
  planVersion: 2,
  verification: Object.freeze({ status: "passed", evidenceHash: "c".repeat(64) }),
});
const snapshot = Object.freeze({
  run: Object.freeze({ id: "run-1", status: "awaiting-approval" }),
  proposal: Object.freeze({ plan: Object.freeze({ version: 2, steps: Object.freeze([]) }), diff: "+fixed" }),
  verification: Object.freeze({ status: "passed", evidence: Object.freeze({ stdout: "ok", stderr: "" }) }),
  critique: Object.freeze({ status: "accepted" }),
  reviewBinding,
});
const timeline = Object.freeze([
  Object.freeze({ runId: "run-1", sequence: 1, type: "run-created", occurredAt: "2026-08-16T08:00:00.000Z" }),
]);
const decision = Object.freeze({ runId: "run-1", status: "approved", idempotencyKey: "decision-1" });

const query = createRunReviewQuery({
  reviewStore: { get: async () => snapshot },
  timelineStore: { list: async () => timeline },
  approvalStore: { get: async () => decision },
});
const evidence = await query.loadRunReviewEvidence("run-1");
assert.deepEqual(evidence, {
  run: snapshot.run,
  timeline,
  proposal: snapshot.proposal,
  verification: snapshot.verification,
  critique: snapshot.critique,
  approval: decision,
});
assert.equal(Object.isFrozen(evidence), true);
assert.equal(Object.isFrozen(evidence.timeline), true);
assert.deepEqual(await query.loadApprovalState("run-1"), {
  runStatus: "awaiting-approval",
  decision,
  reviewBinding,
});

const pendingQuery = createRunReviewQuery({
  reviewStore: { get: async () => snapshot },
  timelineStore: { list: async () => timeline },
  approvalStore: { get: async () => null },
});
const pendingEvidence = await pendingQuery.loadRunReviewEvidence("run-1");
assert.equal("approval" in pendingEvidence, false);

let adjacentReadCount = 0;
const missingQuery = createRunReviewQuery({
  reviewStore: { get: async () => null },
  timelineStore: { list: async () => { adjacentReadCount += 1; return []; } },
  approvalStore: { get: async () => { adjacentReadCount += 1; return null; } },
});
assert.equal(await missingQuery.loadRunReviewEvidence("run-missing"), null);
assert.equal(adjacentReadCount, 0);
assert.deepEqual(await missingQuery.loadApprovalState("run-missing"), {
  runStatus: null,
  decision: null,
  reviewBinding: null,
});

assert.throws(() => createRunReviewQuery({ reviewStore: {}, timelineStore: {}, approvalStore: {} }), /requires review/u);
await assert.rejects(query.loadRunReviewEvidence(" "), /requires a run ID/u);
