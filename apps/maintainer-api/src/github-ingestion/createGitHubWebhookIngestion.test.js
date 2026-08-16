import assert from "node:assert/strict";

import { createGitHubWebhookIngestion } from "./index.js";

const revision = "a".repeat(40);
const requests = [];
const savedRuns = [];
const dispatchedRuns = [];
let saveStatus = "created";
const ingestWebhook = createGitHubWebhookIngestion({
  requestGitHub: async (request) => {
    requests.push(request);
    return { statusCode: 200, body: { object: { sha: revision } } };
  },
  saveSubmittedRun: async (run) => {
    savedRuns.push(run);
    return { status: saveStatus, run: Object.freeze({ ...run,
      submittedAt: "2026-08-16T14:00:00.000Z" }) };
  },
  dispatchRun: async (run) => { dispatchedRuns.push(run); return { status: "started",
    workflowId: run.id }; },
  reconcilePullRequestWebhook: async (envelope) => ({ status: "recorded",
    deliveryId: envelope.deliveryId }),
});
const envelope = { deliveryId: "delivery-1", eventName: "issues",
  observedAt: "2026-08-16T14:00:00.000Z", payload: { action: "labeled",
    label: { name: "patch-pilot" }, installation: { id: 17 },
    repository: { full_name: "octo/example", default_branch: "release/v1" },
    issue: { number: 42, body: "<!-- patch-pilot:expected-failure -->\nreported assertion\n<!-- /patch-pilot:expected-failure -->" },
    sender: { id: 23 } } };

const accepted = await ingestWebhook(envelope);
assert.equal(accepted.status, "accepted");
assert.equal(accepted.run.submittedAt, "2026-08-16T14:00:00.000Z");
assert.deepEqual(requests, [{ installationId: 17, method: "GET",
  path: "/repos/octo/example/git/ref/heads/release%2Fv1" }]);
assert.equal(savedRuns[0].baseRevision, revision);
assert.equal(savedRuns[0].expectedFailure, "reported assertion");
assert.equal(dispatchedRuns[0].id, "github:delivery-1");

saveStatus = "existing";
assert.equal((await ingestWebhook(envelope)).status, "replayed");
saveStatus = "conflict";
assert.deepEqual(await ingestWebhook(envelope), { status: "conflict",
  reason: "run-submission-conflict" });
assert.deepEqual(await ingestWebhook({ eventName: "pull_request", deliveryId: "pr-1" }),
  { status: "recorded", deliveryId: "pr-1" });

const failingIngestion = createGitHubWebhookIngestion({
  requestGitHub: async () => ({ statusCode: 404, body: {} }),
  saveSubmittedRun: async () => ({ status: "created" }),
  dispatchRun: async () => ({ status: "started" }),
  reconcilePullRequestWebhook: async () => ({ status: "ignored" }),
});
await assert.rejects(failingIngestion(envelope), /immutable revision/u);
assert.throws(() => createGitHubWebhookIngestion({}), /requires provider/u);
