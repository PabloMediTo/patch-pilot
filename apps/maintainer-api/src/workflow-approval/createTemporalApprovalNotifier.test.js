import assert from "node:assert/strict";

import { createTemporalApprovalNotifier } from "./index.js";

const signals = [];
const notify = createTemporalApprovalNotifier({ client: { workflow: {
  getHandle: (workflowId) => ({ signal: async (name, decision) => {
    signals.push({ workflowId, name, decision });
  } }),
} } });
const decision = Object.freeze({ runId: "run-1", actorId: "operator:pablo",
  idempotencyKey: "approval-1", status: "approved", reason: null,
  decidedAt: "2026-08-21T10:00:00.000Z", reviewBinding: Object.freeze({
    baseRevision: "a".repeat(40), diffHash: "b".repeat(64), planVersion: 2,
    verification: Object.freeze({ status: "passed", evidenceHash: "c".repeat(64) }),
  }) });

assert.deepEqual(await notify(decision), { status: "signaled", workflowId: "run-1",
  signalName: "reviewDecision" });
assert.deepEqual(signals, [{ workflowId: "run-1", name: "reviewDecision", decision }]);
await assert.rejects(notify({ ...decision, reviewBinding: null }), /persisted bound decision/u);
assert.throws(() => createTemporalApprovalNotifier({}), /workflow client/u);
const invalidHandle = createTemporalApprovalNotifier({ client: { workflow: {
  getHandle: () => ({}),
} } });
await assert.rejects(invalidHandle(decision), /cannot receive/u);
