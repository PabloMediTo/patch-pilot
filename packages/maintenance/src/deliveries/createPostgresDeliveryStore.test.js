import assert from "node:assert/strict";

import { createPostgresDeliveryStore } from "./index.js";

const delivery = Object.freeze({
  runId: "github:delivery-123",
  installationId: 17,
  repository: "octo/example",
  issueNumber: 42,
  baseBranch: "main",
  branchName: "patch-pilot/abc123",
  headRevision: "d".repeat(40),
  proposalBinding: Object.freeze({ baseRevision: "a".repeat(40), diffHash: "b".repeat(64),
    planVersion: 2, verification: Object.freeze({ status: "passed", evidenceHash: "c".repeat(64) }) }),
  pullRequest: Object.freeze({ number: 84,
    url: "https://github.com/octo/example/pull/84", draft: true }),
  deliveredAt: "2026-08-15T12:00:00.000Z",
});
const row = {
  run_id: delivery.runId, installation_id: "17", repository: delivery.repository,
  issue_number: 42, base_branch: "main", branch_name: "patch-pilot/abc123",
  head_revision: delivery.headRevision, base_revision: delivery.proposalBinding.baseRevision,
  diff_hash: delivery.proposalBinding.diffHash, plan_version: 2, verification_status: "passed",
  verification_evidence_hash: delivery.proposalBinding.verification.evidenceHash,
  pull_request_number: 84, pull_request_url: delivery.pullRequest.url,
  pull_request_draft: true, delivered_at: delivery.deliveredAt,
};
const queries = [];
let insertRows = [row];
let selectRows = [row];
const pool = {
  query: async (sql, values) => {
    queries.push({ sql, values });
    if (sql.includes("CREATE TABLE")) return { rows: [] };
    return { rows: sql.includes("INSERT INTO") ? insertRows : selectRows };
  },
  end: async () => undefined,
};
const store = await createPostgresDeliveryStore({ pool });

const created = await store.saveDelivery(delivery);
assert.equal(created.status, "created");
assert.deepEqual(created.delivery, delivery);
assert.match(queries[1].sql, /ON CONFLICT DO NOTHING/u);
assert.deepEqual(queries[1].values, [delivery.runId, 17, "octo/example", 42, "main",
  "patch-pilot/abc123", delivery.headRevision, delivery.proposalBinding.baseRevision,
  delivery.proposalBinding.diffHash, 2, "passed", delivery.proposalBinding.verification.evidenceHash,
  84, delivery.pullRequest.url, true, delivery.deliveredAt]);

assert.deepEqual(await store.get(delivery.runId), delivery);
assert.deepEqual(await store.getByPullRequest("octo/example", 84), delivery);
assert.deepEqual(queries.at(-1).values, ["octo/example", 84]);
assert.equal(queries.filter(({ sql }) => sql.includes("CREATE TABLE")).length, 1);

insertRows = [];
const existing = await store.saveDelivery(delivery);
assert.equal(existing.status, "existing");
assert.deepEqual(existing.delivery, delivery);

selectRows = [];
const uniqueConflict = await store.saveDelivery({ ...delivery, runId: "github:other-run" });
assert.deepEqual(uniqueConflict, { status: "conflict", delivery: null });

assert.match(queries[0].sql, /UNIQUE \(repository, branch_name\)/u);
assert.match(queries[0].sql, /UNIQUE \(repository, pull_request_number\)/u);
