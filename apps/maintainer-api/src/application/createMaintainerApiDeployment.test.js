import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createServer, request } from "node:http";

import { createMaintainerApiDeployment } from "./index.js";

const webhookSecret = "deployment-webhook-secret";
const reconciled = [];
const pool = { endCalls: 0, async query(sql, values) {
  if (sql.includes("INSERT INTO maintenance_runs")) return { rows: [mapRunRow(values)] };
  return { rows: [] };
},
  async end() { this.endCalls += 1; } };
const timelineStream = { closeCalls: 0, async subscribe() { return async () => undefined; },
  async close() { this.closeCalls += 1; } };
const dispatchedRuns = [];
const approvalSignals = [];
const temporalResource = { closeCalls: 0, client: { workflow: {
  async start(_workflowType, options) {
    dispatchedRuns.push(options.args[0]);
    return { workflowId: options.workflowId };
  },
  getHandle(workflowId) { return { signal: async (name, decision) => {
    approvalSignals.push({ workflowId, name, decision });
  } }; },
} },
  async close() { this.closeCalls += 1; } };
const githubReconciliationRuntime = {
  closeCalls: 0,
  reconcilePullRequestWebhook: async (envelope) => {
    reconciled.push(envelope);
    return Object.freeze({ status: "recorded" });
  },
  async close() { this.closeCalls += 1; await pool.end(); },
};
const port = await reservePort();
const deployment = await createMaintainerApiDeployment({ environment: createEnvironment(port),
  pool, timelineStream, githubReconciliationRuntime,
  temporalResource,
  githubRequest: async () => ({ statusCode: 200, body: { object: { sha: "a".repeat(40) } } }) });

await deployment.listen();
const body = JSON.stringify({ action: "closed" });
const response = await exchange(deployment.server, { body, eventName: "pull_request" });
assert.equal(response.statusCode, 202);
assert.equal(reconciled[0].eventName, "pull_request");
assert.deepEqual(JSON.parse(response.body), { status: "recorded" });
const issueBody = JSON.stringify({ action: "labeled", label: { name: "patch-pilot" },
  installation: { id: 17 }, repository: { full_name: "octo/example", default_branch: "main" },
  issue: { number: 42, title: "Correct the reported assertion",
    body: "The calculation is incorrect.\n\n<!-- patch-pilot:expected-failure -->\nreported assertion\n<!-- /patch-pilot:expected-failure -->" },
  sender: { id: 23 } });
const issueResponse = await exchange(deployment.server,
  { body: issueBody, eventName: "issues", deliveryId: "issue-delivery-1" });
assert.equal(issueResponse.statusCode, 202);
assert.deepEqual(JSON.parse(issueResponse.body), { status: "accepted" });
assert.equal(dispatchedRuns[0].id, "github:issue-delivery-1");
assert.equal(dispatchedRuns[0].submittedAt, "2026-08-16T14:00:00.000Z");
assert.equal(dispatchedRuns[0].issueTitle, "Correct the reported assertion");
assert.equal(dispatchedRuns[0].issueContext, "The calculation is incorrect.");
await deployment.close();
await deployment.close();
assert.equal(timelineStream.closeCalls, 1);
assert.equal(temporalResource.closeCalls, 1);
assert.deepEqual(approvalSignals, []);
assert.equal(githubReconciliationRuntime.closeCalls, 1);
assert.equal(pool.endCalls, 1);

await assert.rejects(createMaintainerApiDeployment({ environment: {}, pool,
  timelineStream, temporalResource, githubReconciliationRuntime }), /valid listener/u);

const failedPool = { endCalls: 0, async query() { return { rows: [] }; },
  async end() { this.endCalls += 1; } };
const failedStream = { closeCalls: 0, async close() { this.closeCalls += 1; } };
const failedTemporalResource = { closeCalls: 0, client: { workflow: {
  start: async () => undefined, getHandle: () => ({ signal: async () => undefined }),
} }, async close() { this.closeCalls += 1; } };
await assert.rejects(createMaintainerApiDeployment({ environment: createEnvironment(3001),
  pool: failedPool, timelineStream: failedStream,
  temporalResource: failedTemporalResource }));
assert.equal(failedStream.closeCalls, 1);
assert.equal(failedTemporalResource.closeCalls, 1);
assert.equal(failedPool.endCalls, 1);

/** Creates complete deployment environment values without real credentials. */
function createEnvironment(port) {
  return { PATCH_PILOT_API_BEARER_TOKEN: "private-api-token-with-at-least-32-characters",
    PATCH_PILOT_API_ACTOR_ID: "operator:pablo", PATCH_PILOT_GITHUB_WEBHOOK_SECRET: webhookSecret,
    PATCH_PILOT_GITHUB_APP_ID: "123", PATCH_PILOT_GITHUB_APP_PRIVATE_KEY: "controlled-test-key",
    PATCH_PILOT_API_PORT: String(port) };
}

/** Reserves and releases one loopback port for the deployment-listener proof. */
function reservePort() {
  const probe = createServer();
  return new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const port = probe.address().port;
      probe.close((error) => error === undefined ? resolve(port) : reject(error));
    });
  });
}

/** Sends one correctly signed pull-request webhook to the deployment listener. */
function exchange(server, input) {
  return new Promise((resolve, reject) => {
    const outgoing = request(`http://127.0.0.1:${server.address().port}/github/webhooks`, {
      method: "POST", headers: { "x-github-delivery": input.deliveryId ?? "delivery-1",
        "x-github-event": input.eventName,
        "x-hub-signature-256": `sha256=${createHmac("sha256", webhookSecret)
          .update(input.body, "utf8").digest("hex")}` },
    }, (incoming) => {
      const chunks = [];
      incoming.on("data", (chunk) => chunks.push(chunk));
      incoming.on("end", () => resolve({ statusCode: incoming.statusCode,
        body: Buffer.concat(chunks).toString("utf8") }));
    });
    outgoing.once("error", reject);
    outgoing.end(input.body);
  });
}

/** Maps submitted-run insert values to the Postgres row returned to the deployment. */
function mapRunRow(values) {
  return { run_id: values[0], installation_id: values[1], repository: values[2],
    issue_number: values[3], issue_title: values[4], issue_context: values[5],
    expected_failure: values[6], default_branch: values[7],
    base_revision: values[8], actor_id: values[9], source_delivery_id: values[10],
    run_status: values[11],
    submitted_at: "2026-08-16T14:00:00.000Z" };
}
