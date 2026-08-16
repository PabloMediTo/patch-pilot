import assert from "node:assert/strict";

import { reconcileGitHubPullRequest } from "./index.js";

const delivery = Object.freeze({ runId: "run-1", installationId: 17,
  repository: "octo/example", baseBranch: "main", branchName: `patch-pilot/${"a".repeat(24)}`,
  headRevision: "b".repeat(40),
  pullRequest: Object.freeze({ number: 84, url: "https://github.com/octo/example/pull/84",
    draft: true }) });
const payload = Object.freeze({ action: "opened", installation: { id: 17 },
  repository: { full_name: "octo/example" }, number: 84,
  pull_request: { number: 84, html_url: delivery.pullRequest.url, state: "open", draft: true,
    merged: false, head: { ref: delivery.branchName, sha: delivery.headRevision },
    base: { ref: "main" } } });
const baseInput = { deliveryId: "github-delivery-1", eventName: "pull_request", payload,
  observedAt: "2026-08-16T14:00:00.000Z",
  loadDeliveryByPullRequest: async () => delivery };

let saved;
const recorded = await reconcileGitHubPullRequest(createInput({
  saveObservation: async (observation) => { saved = observation;
    return { status: "created", observation }; },
}));
assert.equal(recorded.status, "recorded");
assert.equal(saved.reconciliation.status, "matched");
assert.deepEqual(saved.reconciliation.differences, []);
assert.equal(saved.runId, "run-1");

const closed = await reconcileGitHubPullRequest(createInput({ payload: {
  ...payload, action: "closed", pull_request: { ...payload.pull_request,
    state: "closed", draft: false, merged: true },
} }));
assert.equal(closed.observation.reconciliation.status, "matched");
assert.equal(closed.observation.pullRequest.merged, true);

const diverged = await reconcileGitHubPullRequest(createInput({ payload: {
  ...payload, action: "synchronize", pull_request: { ...payload.pull_request,
    head: { ...payload.pull_request.head, sha: "c".repeat(40) } },
} }));
assert.equal(diverged.observation.reconciliation.status, "diverged");
assert.deepEqual(diverged.observation.reconciliation.differences, ["head-revision"]);

let externalCalls = 0;
const ignoredEvent = await reconcileGitHubPullRequest(createInput({ eventName: "issues",
  loadDeliveryByPullRequest: async () => { externalCalls += 1; },
  saveObservation: async () => { externalCalls += 1; } }));
assert.deepEqual(ignoredEvent, { status: "ignored", reason: "unsupported-event" });
assert.equal(externalCalls, 0);

const untracked = await reconcileGitHubPullRequest(createInput({
  loadDeliveryByPullRequest: async () => null,
  saveObservation: async () => { externalCalls += 1; },
}));
assert.deepEqual(untracked, { status: "ignored", reason: "untracked-pull-request" });
assert.equal(externalCalls, 0);

const replayed = await reconcileGitHubPullRequest(createInput({
  saveObservation: async () => ({ status: "existing", observation: {
    observedAt: saved.observedAt, reconciliation: saved.reconciliation,
    pullRequest: saved.pullRequest, installationId: saved.installationId,
    repository: saved.repository, action: saved.action, runId: saved.runId,
    deliveryId: saved.deliveryId,
  } }),
}));
assert.equal(replayed.status, "replayed");

const conflict = await reconcileGitHubPullRequest(createInput({
  saveObservation: async () => ({ status: "existing",
    observation: { ...saved, action: "closed" } }),
}));
assert.deepEqual(conflict, { status: "conflict", reason: "webhook-delivery-conflict" });

await assert.rejects(reconcileGitHubPullRequest(createInput({ payload: {
  ...payload, pull_request: { ...payload.pull_request, head: { ref: "unsafe", sha: "short" } },
} })), /malformed reconciliation/u);
await assert.rejects(reconcileGitHubPullRequest(createInput({
  loadDeliveryByPullRequest: async () => ({ runId: "incomplete" }),
})), /malformed delivery evidence/u);

/** Creates one reconciliation fixture with recording defaults. */
function createInput(overrides = {}) {
  return { ...baseInput, ...overrides,
    saveObservation: overrides.saveObservation
      ?? (async (observation) => ({ status: "created", observation })) };
}
