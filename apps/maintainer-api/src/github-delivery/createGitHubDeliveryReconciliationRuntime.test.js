import assert from "node:assert/strict";

import { createGitHubDeliveryReconciliationRuntime } from "./index.js";

const pool = createPool();
const runtime = await createGitHubDeliveryReconciliationRuntime({ pool });
const reconciled = await runtime.reconcilePullRequestWebhook({ deliveryId: "webhook-123",
  eventName: "pull_request", observedAt: "2026-08-21T10:05:00.000Z",
  payload: { action: "ready_for_review", installation: { id: 17 },
    repository: { full_name: "octo/example" }, number: 84,
    pull_request: { number: 84, html_url: "https://github.com/octo/example/pull/84",
      head: { ref: pool.deliveryRow.branch_name, sha: pool.deliveryRow.head_revision },
      base: { ref: "main" }, state: "open", draft: false, merged: false } } });

assert.equal(reconciled.status, "recorded");
assert.equal(reconciled.observation.reconciliation.status, "matched");
assert.equal(pool.observationRow.delivery_id, "webhook-123");
await runtime.close();
await runtime.close();
assert.equal(pool.endCalls, 1);
await assert.rejects(runtime.reconcilePullRequestWebhook({}), /closed/u);
await assert.rejects(createGitHubDeliveryReconciliationRuntime({}), /managed Postgres/u);

/** Creates an in-memory query port with one tracked draft-pull-request delivery. */
function createPool() {
  return { deliveryRow: { run_id: "run-1", installation_id: 17,
    repository: "octo/example", issue_number: 42, base_branch: "main",
    branch_name: "patch-pilot/1234567890abcdef12345678", head_revision: "e".repeat(40),
    base_revision: "a".repeat(40), diff_hash: "b".repeat(64), plan_version: 2,
    verification_status: "passed", verification_evidence_hash: "c".repeat(64),
    pull_request_number: 84, pull_request_url: "https://github.com/octo/example/pull/84",
    pull_request_draft: true, delivered_at: "2026-08-21T10:00:00.000Z" },
  observationRow: null, endCalls: 0,
  async query(sql, values) {
    if (sql.includes("CREATE TABLE")) return { rows: [] };
    if (sql.startsWith("SELECT") && sql.includes("run_pull_request_deliveries")) {
      return { rows: [this.deliveryRow] };
    }
    if (sql.includes("INSERT INTO run_github_delivery_observations")) {
      this.observationRow = mapObservationValues(values);
      return { rows: [this.observationRow] };
    }
    if (sql.startsWith("SELECT") && sql.includes("run_github_delivery_observations")) {
      return { rows: this.observationRow === null ? [] : [this.observationRow] };
    }
    throw new Error("Unexpected reconciliation query.");
  },
  async end() { this.endCalls += 1; } };
}

/** Maps stable observation values back to one Postgres-like row. */
function mapObservationValues(values) {
  return { delivery_id: values[0], run_id: values[1], action: values[2], repository: values[3],
    installation_id: values[4], pull_request_number: values[5], pull_request_url: values[6],
    head_branch: values[7], head_revision: values[8], base_branch: values[9],
    pull_request_state: values[10], pull_request_draft: values[11],
    pull_request_merged: values[12], reconciliation_status: values[13],
    differences: values[14], observed_at: values[15] };
}
