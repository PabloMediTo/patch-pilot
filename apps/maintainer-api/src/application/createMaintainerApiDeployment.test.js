import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createServer, request } from "node:http";

import { createMaintainerApiDeployment } from "./index.js";

const webhookSecret = "deployment-webhook-secret";
const reconciled = [];
const pool = { endCalls: 0, async query() { return { rows: [] }; },
  async end() { this.endCalls += 1; } };
const timelineStream = { closeCalls: 0, async subscribe() { return async () => undefined; },
  async close() { this.closeCalls += 1; } };
const githubDeliveryRuntime = {
  closeCalls: 0,
  deliverApprovedPullRequest: async () => ({ status: "created" }),
  reconcilePullRequestWebhook: async (envelope) => {
    reconciled.push(envelope);
    return Object.freeze({ status: "recorded" });
  },
  async close() { this.closeCalls += 1; await pool.end(); },
};
const port = await reservePort();
const deployment = await createMaintainerApiDeployment({ environment: createEnvironment(port),
  pool, timelineStream, githubDeliveryRuntime });

await deployment.listen();
const body = JSON.stringify({ action: "closed" });
const response = await exchange(deployment.server, body);
assert.equal(response.statusCode, 202);
assert.equal(reconciled[0].eventName, "pull_request");
assert.deepEqual(JSON.parse(response.body), { status: "recorded" });
assert.deepEqual(await deployment.deliverApprovedPullRequest({}), { status: "created" });

await deployment.close();
await deployment.close();
assert.equal(timelineStream.closeCalls, 1);
assert.equal(githubDeliveryRuntime.closeCalls, 1);
assert.equal(pool.endCalls, 1);

await assert.rejects(createMaintainerApiDeployment({ environment: {}, pool,
  timelineStream, githubDeliveryRuntime }), /valid listener and GitHub App/u);

const failedPool = { endCalls: 0, async query() { return { rows: [] }; },
  async end() { this.endCalls += 1; } };
const failedStream = { closeCalls: 0, async close() { this.closeCalls += 1; } };
await assert.rejects(createMaintainerApiDeployment({ environment: createEnvironment(3001),
  pool: failedPool, timelineStream: failedStream }));
assert.equal(failedStream.closeCalls, 1);
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
function exchange(server, body) {
  return new Promise((resolve, reject) => {
    const outgoing = request(`http://127.0.0.1:${server.address().port}/github/webhooks`, {
      method: "POST", headers: { "x-github-delivery": "delivery-1",
        "x-github-event": "pull_request",
        "x-hub-signature-256": `sha256=${createHmac("sha256", webhookSecret)
          .update(body, "utf8").digest("hex")}` },
    }, (incoming) => {
      const chunks = [];
      incoming.on("data", (chunk) => chunks.push(chunk));
      incoming.on("end", () => resolve({ statusCode: incoming.statusCode,
        body: Buffer.concat(chunks).toString("utf8") }));
    });
    outgoing.once("error", reject);
    outgoing.end(body);
  });
}
