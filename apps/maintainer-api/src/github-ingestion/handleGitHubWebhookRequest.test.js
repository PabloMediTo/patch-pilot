import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import { handleGitHubWebhookRequest } from "./index.js";

const secret = "webhook-secret";
const rawBody = JSON.stringify({ action: "closed", pull_request: { number: 84 } });
const signature = sign(rawBody);
const ingested = [];

const accepted = createInput({ rawBody, signature,
  ingestWebhook: async (envelope) => { ingested.push(envelope); return { status: "recorded" }; } });
const acceptedOutcome = await handleGitHubWebhookRequest(accepted);
assert.equal(acceptedOutcome.statusCode, 202);
assert.deepEqual(JSON.parse(accepted.response.body), { status: "recorded" });
assert.deepEqual(ingested, [{ deliveryId: "delivery-123", eventName: "pull_request",
  payload: JSON.parse(rawBody), observedAt: "2026-08-16T13:00:00.000Z" }]);

const invalidSignature = createInput({ rawBody, signature: "sha256=invalid" });
assert.equal((await handleGitHubWebhookRequest(invalidSignature)).statusCode, 401);
assert.equal(invalidSignature.readCount, 1);
assert.equal(ingested.length, 1);

const missingDelivery = createInput({ headers: { "x-hub-signature-256": signature,
  "x-github-event": "pull_request" } });
await assert.rejects(handleGitHubWebhookRequest(missingDelivery), /missing-x-github-delivery/u);

const malformed = createInput({ rawBody: "{", signature: sign("{") });
await assert.rejects(handleGitHubWebhookRequest(malformed), /invalid-github-json/u);

const conflict = createInput({ rawBody, signature,
  ingestWebhook: async () => ({ status: "conflict", reason: "webhook-delivery-conflict" }) });
assert.equal((await handleGitHubWebhookRequest(conflict)).statusCode, 409);

const invalidPayload = createInput({ rawBody, signature });
invalidPayload.ingestWebhook = async () => {
  const error = new Error("malformed");
  error.code = "invalid-github-webhook";
  throw error;
};
assert.equal((await handleGitHubWebhookRequest(invalidPayload)).statusCode, 400);

const wrongMethod = createInput({ method: "GET" });
assert.equal((await handleGitHubWebhookRequest(wrongMethod)).statusCode, 405);
assert.equal(wrongMethod.readCount, 0);
assert.deepEqual(await handleGitHubWebhookRequest(createInput({ url: "/health" })),
  { status: "unhandled" });

/** Creates one complete HTTP handler fixture. */
function createInput(overrides = {}) {
  const input = { request: { method: overrides.method ?? "POST", url: overrides.url ?? "/github/webhooks",
    headers: overrides.headers ?? { "x-hub-signature-256": overrides.signature ?? signature,
      "x-github-delivery": "delivery-123", "x-github-event": "pull_request" } },
  response: { writeHead(code, headers) { this.code = code; this.headers = headers; },
    end(body) { this.body = body; } }, secret, readCount: 0,
  readRawBody: async () => { input.readCount += 1; return overrides.rawBody ?? rawBody; },
  ingestWebhook: overrides.ingestWebhook ?? (async () => ({ status: "ignored" })),
  clock: () => new Date("2026-08-16T13:00:00.000Z") };
  return input;
}

/** Signs one exact webhook body with the test secret. */
function sign(body) {
  return `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
}
