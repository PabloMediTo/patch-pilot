import assert from "node:assert/strict";

import { decideRunApproval } from "./index.js";

const baseInput = {
  runId: "run-1",
  actorId: "user-7",
  idempotencyKey: "request-1",
  decision: "approved",
  decidedAt: "2026-08-14T12:00:00.000Z",
};
let saved;
const created = await decideRunApproval({
  ...baseInput,
  loadApprovalState: async () => ({ runStatus: "awaiting-approval", decision: null }),
  saveFirstDecision: async (decision) => {
    saved = decision;
    return { status: "created", decision };
  },
});
assert.equal(created.status, "created");
assert.equal(saved.reason, null);
assert.equal(saved.actorId, "user-7");

let saveCalls = 0;
const replayed = await decideRunApproval({
  ...baseInput,
  loadApprovalState: async () => ({ runStatus: "approved", decision: saved }),
  saveFirstDecision: async () => { saveCalls += 1; },
});
assert.equal(replayed.status, "replayed");
assert.equal(saveCalls, 0);

const conflict = await decideRunApproval({
  ...baseInput,
  idempotencyKey: "request-2",
  loadApprovalState: async () => ({ runStatus: "approved", decision: saved }),
  saveFirstDecision: async () => { saveCalls += 1; },
});
assert.deepEqual(conflict, { status: "conflict", reason: "decision-already-recorded" });

await assert.rejects(decideRunApproval({
  ...baseInput,
  decision: "rejected",
  reason: " ",
  loadApprovalState: async () => ({}),
  saveFirstDecision: async () => ({}),
}), /Approval requires/u);

const notReady = await decideRunApproval({
  ...baseInput,
  loadApprovalState: async () => ({ runStatus: "verifying", decision: null }),
  saveFirstDecision: async () => { saveCalls += 1; },
});
assert.deepEqual(notReady, { status: "conflict", reason: "run-not-awaiting-approval" });
assert.equal(saveCalls, 0);
