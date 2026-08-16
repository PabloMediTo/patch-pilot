import assert from "node:assert/strict";

import { createPostgresDeliveryObservationStore } from "./index.js";

const observation = Object.freeze({ deliveryId: "github-delivery-123",
  runId: "github:delivery-123", action: "synchronize", repository: "octo/example",
  installationId: 17, pullRequest: Object.freeze({ number: 84,
    url: "https://github.com/octo/example/pull/84", headBranch: "patch-pilot/abc123",
    headRevision: "d".repeat(40), baseBranch: "main", state: "open", draft: true,
    merged: false }), reconciliation: Object.freeze({ status: "diverged",
    differences: Object.freeze(["head-revision"]) }), observedAt: "2026-08-16T12:00:00.000Z" });
const row = { delivery_id: observation.deliveryId, run_id: observation.runId,
  action: observation.action, repository: observation.repository, installation_id: "17",
  pull_request_number: 84, pull_request_url: observation.pullRequest.url,
  head_branch: observation.pullRequest.headBranch,
  head_revision: observation.pullRequest.headRevision, base_branch: "main",
  pull_request_state: "open", pull_request_draft: true, pull_request_merged: false,
  reconciliation_status: "diverged", differences: ["head-revision"],
  observed_at: observation.observedAt };
const queries = [];
let insertRows = [row];
let selectRows = [row];
let isClosed = false;
const pool = {
  query: async (sql, values) => {
    queries.push({ sql, values });
    if (sql.includes("CREATE TABLE")) return { rows: [] };
    return { rows: sql.includes("INSERT INTO") ? insertRows : selectRows };
  },
  end: async () => { isClosed = true; },
};
const store = await createPostgresDeliveryObservationStore({ pool });

const created = await store.saveObservation(observation);
assert.equal(created.status, "created");
assert.deepEqual(created.observation, observation);
assert.match(queries[1].sql, /ON CONFLICT DO NOTHING/u);
assert.deepEqual(queries[1].values, [observation.deliveryId, observation.runId, "synchronize",
  "octo/example", 17, 84, observation.pullRequest.url, "patch-pilot/abc123",
  observation.pullRequest.headRevision, "main", "open", true, false, "diverged",
  observation.reconciliation.differences, observation.observedAt]);

assert.deepEqual(await store.get(observation.deliveryId), observation);
assert.equal(queries.filter(({ sql }) => sql.includes("CREATE TABLE")).length, 1);

insertRows = [];
const existing = await store.saveObservation(observation);
assert.equal(existing.status, "existing");
assert.deepEqual(existing.observation, observation);

selectRows = [];
assert.deepEqual(await store.saveObservation({ ...observation, deliveryId: "missing" }),
  { status: "conflict", observation: null });

assert.match(queries[0].sql, /delivery_id text PRIMARY KEY/u);
assert.match(queries[0].sql, /cardinality\(differences\) = 0/u);
assert.match(queries[0].sql, /cardinality\(differences\) > 0/u);
await store.close();
assert.equal(isClosed, true);
