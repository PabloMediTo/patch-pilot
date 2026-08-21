import assert from "node:assert/strict";

import { createReviewDecisionWaiter } from "./createReviewDecisionWaiter.js";

const binding = Object.freeze({ baseRevision: "a".repeat(40), diffHash: "b".repeat(64),
  planVersion: 2, verification: Object.freeze({ status: "passed",
    evidenceHash: "c".repeat(64) }) });
const decision = Object.freeze({ runId: "run-1", actorId: "operator:pablo",
  idempotencyKey: "approval-1", status: "approved", reason: null,
  decidedAt: "2026-08-21T10:00:00.000Z", reviewBinding: binding });

const earlyWaiter = createReviewDecisionWaiter({ runId: "run-1",
  waitUntil: async (predicate) => {
    assert.equal(predicate(), true);
  } });
earlyWaiter.receive(decision);
assert.deepEqual(await earlyWaiter.waitForDecision(binding), decision);

let reevaluate;
const delayedWaiter = createReviewDecisionWaiter({ runId: "run-1",
  waitUntil: (predicate) => new Promise((resolve) => {
    reevaluate = () => { if (predicate()) resolve(); };
  }) });
const delayedDecision = delayedWaiter.waitForDecision(binding);
delayedWaiter.receive({ ...decision, runId: "run-2" });
reevaluate();
delayedWaiter.receive({ ...decision, reviewBinding: { ...binding, diffHash: "d".repeat(64) } });
reevaluate();
let isSettled = false;
delayedDecision.then(() => { isSettled = true; });
await Promise.resolve();
assert.equal(isSettled, false);
delayedWaiter.receive({ ...decision, status: "rejected", reason: "Needs a narrower fix" });
reevaluate();
assert.deepEqual(await delayedDecision, { ...decision, status: "rejected",
  reason: "Needs a narrower fix" });

assert.throws(() => createReviewDecisionWaiter({}), /run identity and durable condition/u);
const invalidBindingWaiter = createReviewDecisionWaiter({ runId: "run-1",
  waitUntil: async () => undefined });
await assert.rejects(invalidBindingWaiter.waitForDecision({}), /exact review binding/u);
const fixedBindingWaiter = createReviewDecisionWaiter({ runId: "run-1",
  waitUntil: async () => undefined });
fixedBindingWaiter.receive(decision);
await fixedBindingWaiter.waitForDecision(binding);
await assert.rejects(fixedBindingWaiter.waitForDecision({ ...binding, planVersion: 3 }),
  /cannot change/u);
