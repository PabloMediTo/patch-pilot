import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { createPostgresRunReviewStore, createRunReviewSnapshot,
  recordRunReviewSnapshot } from "./index.js";

const input = { run: { id: "run-1", repository: "octo/example", issueNumber: 42,
  baseRevision: "a".repeat(40) }, proposal: { status: "ready",
  plan: { version: 2, summary: "Fix the boundary", steps: [{ sequence: 1,
    description: "Apply fix", rationale: "Reproduced failure", files: ["src/fix.js"] }] },
  sourceDiff: { unifiedDiff: "diff --git a/src/fix.js b/src/fix.js\n-old\n+fixed" } },
verification: { status: "passed", evidence: { command: { executable: "npm",
  args: ["test"] }, exitCode: 0, stdout: "passed", stderr: "", durationMs: 25,
  hasTimedOut: false, hasTruncatedOutput: false } },
critique: { decision: "accepted", findings: [] }, recordedAt: "2026-08-16T14:00:00.000Z" };

const snapshot = createRunReviewSnapshot(input);
assert.equal(snapshot.run.status, "awaiting-approval");
assert.equal(snapshot.proposal.diffHash, hash(input.proposal.sourceDiff.unifiedDiff));
assert.equal(snapshot.verification.evidenceHash,
  hash(JSON.stringify(input.verification.evidence)));
assert.deepEqual(snapshot.reviewBinding, { baseRevision: input.run.baseRevision,
  diffHash: snapshot.proposal.diffHash, planVersion: 2,
  verification: { status: "passed", evidenceHash: snapshot.verification.evidenceHash } });
input.proposal.plan.steps[0].description = "mutated";
assert.equal(snapshot.proposal.plan.steps[0].description, "Apply fix");
assert.equal(Object.isFrozen(snapshot.verification.evidence.command.args), true);
assert.throws(() => createRunReviewSnapshot({ ...input,
  verification: { ...input.verification, status: "failed" } }), /accepted, passed/u);
assert.throws(() => createRunReviewSnapshot({ ...input,
  critique: { decision: "retry" } }), /accepted, passed/u);
assert.throws(() => createRunReviewSnapshot({ ...input,
  recordedAt: 1 }), /accepted, passed/u);

input.proposal.plan.steps[0].description = "Apply fix";
const createdRecord = await recordRunReviewSnapshot({ ...input,
  saveSnapshot: async (candidate) => ({ status: "created", snapshot: candidate }) });
assert.equal(createdRecord.status, "created");
assert.deepEqual(createdRecord.snapshot, snapshot);
const reorderedSnapshot = { recordedAt: snapshot.recordedAt,
  reviewBinding: snapshot.reviewBinding, critique: snapshot.critique,
  verification: snapshot.verification, proposal: snapshot.proposal, run: snapshot.run };
const replayedRecord = await recordRunReviewSnapshot({ ...input,
  saveSnapshot: async () => ({ status: "existing", snapshot: reorderedSnapshot }) });
assert.equal(replayedRecord.status, "existing");
const conflictingRecord = await recordRunReviewSnapshot({ ...input,
  saveSnapshot: async () => ({ status: "existing", snapshot: {
    ...snapshot, proposal: { ...snapshot.proposal, diff: "different" },
  } }) });
assert.equal(conflictingRecord.status, "conflict");
await assert.rejects(recordRunReviewSnapshot({ ...input,
  saveSnapshot: async () => ({ status: "created", snapshot: null }) }), /different created/u);
await assert.rejects(recordRunReviewSnapshot(input), /persistence port/u);

const row = mapRow(snapshot);
const queries = [];
let insertRows = [row];
let selectRows = [row];
let isClosed = false;
const pool = { query: async (sql, values) => {
  queries.push({ sql, values });
  if (sql.includes("CREATE TABLE")) return { rows: [] };
  return { rows: sql.includes("INSERT INTO") ? insertRows : selectRows };
}, end: async () => { isClosed = true; } };
const store = await createPostgresRunReviewStore({ pool });
const created = await store.saveSnapshot(snapshot);
assert.equal(created.status, "created");
assert.deepEqual(created.snapshot, snapshot);
assert.match(queries[1].sql, /ON CONFLICT DO NOTHING/u);
assert.deepEqual(queries[1].values, ["run-1", "octo/example", 42, input.run.baseRevision,
  2, JSON.stringify(snapshot.proposal.plan), snapshot.proposal.diff, snapshot.proposal.diffHash,
  "passed", JSON.stringify(snapshot.verification.evidence), snapshot.verification.evidenceHash,
  JSON.stringify(snapshot.critique), snapshot.recordedAt]);
assert.deepEqual(await store.get("run-1"), snapshot);
assert.equal(queries.filter(({ sql }) => sql.includes("CREATE TABLE")).length, 1);

insertRows = [];
assert.equal((await store.saveSnapshot(snapshot)).status, "existing");
selectRows = [];
assert.deepEqual(await store.saveSnapshot({ ...snapshot,
  run: { ...snapshot.run, id: "missing" } }), { status: "conflict", snapshot: null });
assert.match(queries[0].sql, /run_id text PRIMARY KEY/u);
assert.match(queries[0].sql, /verification_status = 'passed'/u);
await store.close();
assert.equal(isClosed, true);

/** Hashes exact test evidence. */
function hash(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Maps one canonical snapshot into a Postgres-like row. */
function mapRow(value) {
  return { run_id: value.run.id, repository: value.run.repository,
    issue_number: value.run.issueNumber, base_revision: value.run.baseRevision,
    plan_version: value.proposal.plan.version, plan: value.proposal.plan,
    source_diff: value.proposal.diff, diff_hash: value.proposal.diffHash,
    verification_status: value.verification.status,
    verification_evidence: value.verification.evidence,
    verification_evidence_hash: value.verification.evidenceHash,
    critique: value.critique, recorded_at: value.recordedAt };
}
