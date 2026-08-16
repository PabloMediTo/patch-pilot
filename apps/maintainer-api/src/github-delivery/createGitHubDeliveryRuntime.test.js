import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash, generateKeyPairSync } from "node:crypto";

import { createGitHubDeliveryRuntime } from "./index.js";

const baseRevision = "a".repeat(40);
const baseTree = "b".repeat(40);
const baseBlob = "c".repeat(40);
const createdTree = "d".repeat(40);
const headRevision = "e".repeat(40);
const evidenceHash = "f".repeat(64);
const sourceDiff = ["diff --git a/src/fix.js b/src/fix.js",
  `index ${baseBlob}..${"1".repeat(40)} 100644`, "--- a/src/fix.js", "+++ b/src/fix.js",
  "@@ -1 +1 @@", "-old", "+fixed"].join("\n");
const diffHash = createHash("sha256").update(sourceDiff, "utf8").digest("hex");
const approvalRow = Object.freeze({ run_id: "run-1", actor_id: "user-1", idempotency_key: "key-1",
  decision_status: "approved", reason: null, decided_at: "2026-08-16T11:55:00.000Z",
  base_revision: baseRevision, diff_hash: diffHash, plan_version: 2,
  verification_status: "passed", verification_evidence_hash: evidenceHash });
const proposal = Object.freeze({ baseRevision, planVersion: 2, sourceDiff,
  title: "Fix boundary condition", body: "Verified fix",
  verification: Object.freeze({ status: "passed", evidenceHash }) });
const deliveryInput = Object.freeze({ runId: "run-1", installationId: 17,
  repository: "octo/example", issueNumber: 42, baseBranch: "main", proposal });

const pool = createPool();
const providerCalls = [];
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const runtime = await createGitHubDeliveryRuntime({ pool, appId: 123,
  privateKey: privateKey.export({ type: "pkcs8", format: "pem" }),
  fetchImpl: createGitHubFetch(providerCalls),
  clock: () => new Date("2026-08-16T12:00:00.000Z") });

const created = await runtime.deliverApprovedPullRequest(deliveryInput);
assert.equal(created.status, "created");
assert.equal(created.delivery.headRevision, headRevision);
assert.equal(created.delivery.pullRequest.number, 84);
assert.equal(created.delivery.deliveredAt, "2026-08-16T12:00:00.000Z");
assert.equal(pool.deliveryRow.head_revision, headRevision);
assert.deepEqual(providerCalls.map(({ method, pathname }) => `${method} ${pathname}`), [
  "POST /app/installations/17/access_tokens",
  `GET /repos/octo/example/git/commits/${baseRevision}`,
  `GET /repos/octo/example/git/trees/${baseTree}`,
  `GET /repos/octo/example/git/blobs/${baseBlob}`,
  "POST /repos/octo/example/git/trees",
  "POST /repos/octo/example/git/commits",
  `GET /repos/octo/example/git/ref/heads/${created.delivery.branchName}`,
  "POST /repos/octo/example/git/refs",
  "GET /repos/octo/example/pulls",
  "POST /repos/octo/example/pulls",
]);
assert.deepEqual(providerCalls[4].body.tree,
  [{ path: "src/fix.js", mode: "100644", type: "blob", content: "fixed\n" }]);
assert.deepEqual(providerCalls[5].body.parents, [baseRevision]);
assert.equal(providerCalls[7].body.sha, headRevision);
assert.equal(providerCalls[9].body.draft, true);

const providerCallCount = providerCalls.length;
const replayed = await runtime.deliverApprovedPullRequest(deliveryInput);
assert.equal(replayed.status, "replayed");
assert.equal(providerCalls.length, providerCallCount);

const reconciled = await runtime.reconcilePullRequestWebhook({ deliveryId: "webhook-123",
  eventName: "pull_request", observedAt: "2026-08-16T12:05:00.000Z",
  payload: { action: "ready_for_review", installation: { id: 17 },
    repository: { full_name: "octo/example" }, number: 84,
    pull_request: { number: 84, html_url: "https://github.com/octo/example/pull/84",
      head: { ref: created.delivery.branchName, sha: headRevision }, base: { ref: "main" },
      state: "open", draft: false, merged: false } } });
assert.equal(reconciled.status, "recorded");
assert.equal(reconciled.observation.reconciliation.status, "matched");
assert.equal(pool.observationRow.delivery_id, "webhook-123");

await assert.rejects(runtime.deliverApprovedPullRequest({ ...deliveryInput, runId: "" }),
  /run identity/u);
await runtime.close();
await runtime.close();
assert.equal(pool.endCalls, 1);
await assert.rejects(runtime.deliverApprovedPullRequest(deliveryInput), /closed/u);
await assert.rejects(runtime.reconcilePullRequestWebhook({}), /closed/u);

/** Creates an in-memory query port for approval and delivery persistence. */
function createPool() {
  return {
    deliveryRow: null,
    observationRow: null,
    endCalls: 0,
    async query(sql, values) {
      if (sql.includes("CREATE TABLE")) return { rows: [] };
      if (sql.includes("FROM run_approval_decisions")) return { rows: [approvalRow] };
      if (sql.startsWith("SELECT") && sql.includes("run_pull_request_deliveries")) {
        return { rows: this.deliveryRow === null ? [] : [this.deliveryRow] };
      }
      if (sql.startsWith("SELECT") && sql.includes("run_github_delivery_observations")) {
        return { rows: this.observationRow === null ? [] : [this.observationRow] };
      }
      if (sql.includes("INSERT INTO run_pull_request_deliveries")) {
        this.deliveryRow = mapDeliveryValues(values);
        return { rows: [this.deliveryRow] };
      }
      if (sql.includes("INSERT INTO run_github_delivery_observations")) {
        this.observationRow = mapObservationValues(values);
        return { rows: [this.observationRow] };
      }
      throw new Error("Unexpected Postgres query in delivery runtime test.");
    },
    async end() { this.endCalls += 1; },
  };
}

/** Maps stable observation values back to a Postgres-like row. */
function mapObservationValues(values) {
  return { delivery_id: values[0], run_id: values[1], action: values[2], repository: values[3],
    installation_id: values[4], pull_request_number: values[5], pull_request_url: values[6],
    head_branch: values[7], head_revision: values[8], base_branch: values[9],
    pull_request_state: values[10], pull_request_draft: values[11],
    pull_request_merged: values[12], reconciliation_status: values[13],
    differences: values[14], observed_at: values[15] };
}

/** Maps the store's stable parameter order back to a Postgres-like row. */
function mapDeliveryValues(values) {
  return { run_id: values[0], installation_id: values[1], repository: values[2],
    issue_number: values[3], base_branch: values[4], branch_name: values[5],
    head_revision: values[6], base_revision: values[7], diff_hash: values[8],
    plan_version: values[9], verification_status: values[10],
    verification_evidence_hash: values[11], pull_request_number: values[12],
    pull_request_url: values[13], pull_request_draft: values[14], delivered_at: values[15] };
}

/** Creates a complete fake GitHub API for one delivery and records safe request facts. */
function createGitHubFetch(calls) {
  return async function fetchGitHub(url, init) {
    const parsed = new URL(url);
    const body = init.body === undefined ? null : JSON.parse(init.body);
    calls.push({ method: init.method, pathname: parsed.pathname, query: parsed.searchParams, body });
    if (parsed.pathname.includes("/access_tokens")) {
      return createResponse(201, { token: "installation-token",
        expires_at: "2026-08-16T13:00:00.000Z" });
    }
    return routeRepositoryRequest(parsed, init.method, body);
  };
}

/** Returns the provider response for one Git-database, reference, or PR route. */
function routeRepositoryRequest(url, method, body) {
  const path = url.pathname;
  if (path.endsWith(`/git/commits/${baseRevision}`)) {
    return createResponse(200, { sha: baseRevision, tree: { sha: baseTree } });
  }
  if (path.endsWith(`/git/trees/${baseTree}`)) return createResponse(200,
    { sha: baseTree, truncated: false,
      tree: [{ path: "src/fix.js", type: "blob", mode: "100644", sha: baseBlob }] });
  if (path.endsWith(`/git/blobs/${baseBlob}`)) return createResponse(200,
    { sha: baseBlob, encoding: "base64", content: Buffer.from("old\n").toString("base64") });
  if (path.endsWith("/git/trees")) return createResponse(201, { sha: createdTree });
  if (path.endsWith("/git/commits")) return createResponse(201,
    { sha: headRevision, tree: { sha: body.tree }, parents: [{ sha: baseRevision }] });
  if (path.includes("/git/ref/heads/")) return createResponse(404, {});
  if (path.endsWith("/git/refs")) return createResponse(201,
    { object: { type: "commit", sha: body.sha } });
  if (path.endsWith("/pulls") && method === "GET") return createResponse(200, []);
  if (path.endsWith("/pulls")) return createResponse(201,
    { number: 84, html_url: "https://github.com/octo/example/pull/84", state: "open",
      draft: true, head: { ref: body.head }, base: { ref: body.base } });
  return createResponse(500, {});
}

/** Creates one streaming JSON response compatible with the bounded transport. */
function createResponse(status, body) {
  const json = JSON.stringify(body);
  return new Response(json, { status, headers: { "content-type": "application/json",
    "content-length": String(Buffer.byteLength(json)) } });
}
