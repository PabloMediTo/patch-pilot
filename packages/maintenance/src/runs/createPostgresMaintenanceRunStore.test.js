import assert from "node:assert/strict";

import { createMaintenanceRun, createPostgresMaintenanceRunStore } from "./index.js";

const submittedAt = "2026-08-16T12:00:00.000Z";
const run = createMaintenanceRun({ id: "github:delivery-1", installationId: 17,
  repository: "octo/example", issueNumber: 42, defaultBranch: "main",
  issueTitle: "Fix incorrect addition result",
  issueContext: "Addition returns the wrong value.",
  expectedFailure: "expected 2 but received 3",
  baseRevision: "a".repeat(40), actorId: 23, sourceDeliveryId: "delivery-1" });
const row = { run_id: run.id, installation_id: "17", repository: run.repository,
  issue_number: 42, issue_title: run.issueTitle, issue_context: run.issueContext,
  expected_failure: run.expectedFailure, default_branch: "main",
  base_revision: run.baseRevision,
  actor_id: "23", source_delivery_id: "delivery-1", run_status: "submitted",
  submitted_at: submittedAt };
const queries = [];
let isInsertWinner = true;
const pool = { async query(sql, values) {
  queries.push({ sql, values });
  if (sql.includes("CREATE TABLE")) return { rows: [] };
  if (sql.startsWith("INSERT")) return { rows: isInsertWinner ? [row] : [] };
  return { rows: [row] };
}, async end() {} };
const store = await createPostgresMaintenanceRunStore({ pool });

assert.deepEqual(await store.saveSubmittedRun(run), { status: "created",
  run: { ...run, submittedAt } });
assert.deepEqual(queries[1].values, [run.id, 17, "octo/example", 42,
  "Fix incorrect addition result", "Addition returns the wrong value.",
  "expected 2 but received 3", "main", run.baseRevision, 23, "delivery-1", "submitted"]);
isInsertWinner = false;
assert.deepEqual(await store.saveSubmittedRun(run), { status: "existing",
  run: { ...run, submittedAt } });
assert.deepEqual(await store.get(run.id), { ...run, submittedAt });
assert.equal(queries.filter(({ sql }) => sql.includes("CREATE TABLE")).length, 1);
assert.match(queries[0].sql, /ADD COLUMN IF NOT EXISTS issue_title text/u);
assert.match(queries[0].sql, /ADD COLUMN IF NOT EXISTS issue_context text/u);
assert.match(queries.find(({ sql }) => sql.startsWith("INSERT")).sql, /ON CONFLICT DO NOTHING/u);
assert.match(queries.find(({ sql }) => sql.includes("source_delivery_id = $2")).sql,
  /ORDER BY CASE WHEN run_id = \$1/u);

await assert.rejects(store.saveSubmittedRun({ ...run, status: "running" }), /only submitted/u);

const conflictStore = await createPostgresMaintenanceRunStore({ pool: {
  async query(sql) { return { rows: sql.includes("CREATE TABLE") ? [] : [] }; },
  async end() {},
} });
assert.deepEqual(await conflictStore.saveSubmittedRun(run), { status: "conflict", run: null });

const ambiguousStore = await createPostgresMaintenanceRunStore({ pool: {
  async query(sql) { return { rows: sql.includes("CREATE TABLE") || sql.startsWith("INSERT")
    ? [] : [row, { ...row, run_id: "github:other-delivery" }] }; },
  async end() {},
} });
assert.deepEqual(await ambiguousStore.saveSubmittedRun(run), { status: "conflict", run: null });
