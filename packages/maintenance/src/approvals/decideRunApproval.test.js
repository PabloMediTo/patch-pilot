import assert from "node:assert/strict";

import { createPostgresApprovalStore, decideRunApproval } from "./index.js";

const baseInput = {
  runId: "run-1",
  actorId: "user-7",
  idempotencyKey: "request-1",
  decision: "approved",
  decidedAt: "2026-08-14T12:00:00.000Z",
};
const reviewBinding = Object.freeze({
  baseRevision: "a".repeat(40),
  diffHash: "b".repeat(64),
  planVersion: 2,
  verification: Object.freeze({ status: "passed", evidenceHash: "c".repeat(64) }),
});
let saved;
const created = await decideRunApproval({
  ...baseInput,
  loadApprovalState: async () => ({ runStatus: "awaiting-approval", decision: null, reviewBinding }),
  saveFirstDecision: async (decision) => {
    saved = decision;
    return { status: "created", decision };
  },
});
assert.equal(created.status, "created");
assert.equal(saved.reason, null);
assert.equal(saved.actorId, "user-7");
assert.deepEqual(saved.reviewBinding, reviewBinding);
assert.equal(Object.isFrozen(saved.reviewBinding.verification), true);

let saveCalls = 0;
const replayed = await decideRunApproval({
  ...baseInput,
  loadApprovalState: async () => ({ runStatus: "approved", decision: saved }),
  saveFirstDecision: async () => { saveCalls += 1; },
});
assert.equal(replayed.status, "replayed");
assert.equal(saveCalls, 0);

const queries = [];
const storedRow = {
  run_id: "run-1", actor_id: "user-7", idempotency_key: "request-1",
  decision_status: "approved", reason: null, decided_at: "2026-08-14T12:00:00.000Z",
  base_revision: reviewBinding.baseRevision, diff_hash: reviewBinding.diffHash,
  plan_version: reviewBinding.planVersion, verification_status: "passed",
  verification_evidence_hash: reviewBinding.verification.evidenceHash,
};
const pool = {
  query: async (sql, values) => {
    queries.push({ sql, values });
    if (sql.includes("CREATE TABLE")) return { rows: [] };
    return { rows: [storedRow] };
  },
  end: async () => undefined,
};
const store = await createPostgresApprovalStore({ pool });
const stored = await store.saveFirstDecision(saved);
assert.equal(stored.status, "created");
assert.equal(stored.decision.decidedAt, "2026-08-14T12:00:00.000Z");
assert.match(queries[1].sql, /ON CONFLICT DO NOTHING/u);
assert.deepEqual(queries[1].values, ["run-1", "user-7", "request-1", "approved", null,
  "2026-08-14T12:00:00.000Z", reviewBinding.baseRevision, reviewBinding.diffHash, 2, "passed",
  reviewBinding.verification.evidenceHash]);
assert.equal((await store.get("run-1")).status, "approved");
assert.deepEqual((await store.get("run-1")).reviewBinding, reviewBinding);
assert.equal(queries.filter(({ sql }) => sql.includes("CREATE TABLE")).length, 1);

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

await assert.rejects(decideRunApproval({
  ...baseInput,
  loadApprovalState: async () => ({ runStatus: "awaiting-approval", decision: null }),
  saveFirstDecision: async () => ({}),
}), /exact passed review evidence/u);

await assert.rejects(decideRunApproval({
  ...baseInput,
  loadApprovalState: async () => ({ runStatus: "awaiting-approval", decision: null,
    reviewBinding: { ...reviewBinding, verification: { status: "failed", evidenceHash: "c".repeat(64) } } }),
  saveFirstDecision: async () => ({}),
}), /exact passed review evidence/u);
