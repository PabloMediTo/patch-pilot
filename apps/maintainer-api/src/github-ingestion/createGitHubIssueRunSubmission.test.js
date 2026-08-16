import assert from "node:assert/strict";

import { createGitHubIssueRunSubmission } from "./index.js";

const payload = {
  action: "labeled",
  label: { name: "patch-pilot" },
  installation: { id: 17 },
  repository: { full_name: "octo/example", default_branch: "main" },
  issue: { number: 42, title: "Fix incorrect addition result",
    body: "Addition returns the wrong value.\n\n<!-- patch-pilot:expected-failure -->\nexpected 2 but received 3\n<!-- /patch-pilot:expected-failure -->" },
  sender: { id: 23 },
};
const submittedRuns = [];
const dispatchedRuns = [];

const result = await createGitHubIssueRunSubmission({
  eventName: "issues",
  deliveryId: "delivery-123",
  payload,
  resolveBaseRevision: async () => "a".repeat(40),
  submitRun: async (run) => { submittedRuns.push(run); return { status: "created",
    run: { ...run, submittedAt: "2026-08-16T15:00:00.000Z" } }; },
  dispatchRun: async (run) => { dispatchedRuns.push(run); return { status: "started",
    workflowId: run.id }; },
});

assert.equal(result.status, "accepted");
assert.deepEqual(submittedRuns, [
  {
    id: "github:delivery-123",
    installationId: 17,
    repository: "octo/example",
    issueNumber: 42,
    issueTitle: "Fix incorrect addition result",
    issueContext: "Addition returns the wrong value.",
    expectedFailure: "expected 2 but received 3",
    defaultBranch: "main",
    baseRevision: "a".repeat(40),
    actorId: 23,
    sourceDeliveryId: "delivery-123",
    status: "submitted",
  },
]);
assert.equal(dispatchedRuns[0].id, "github:delivery-123");
assert.equal(result.workflow.status, "started");

await assert.rejects(createGitHubIssueRunSubmission({ eventName: "issues",
  deliveryId: "delivery-invalid", payload: { ...payload,
    issue: { ...payload.issue, body: "no marker" } },
  resolveBaseRevision: async () => "a".repeat(40), submitRun: async () => undefined,
  dispatchRun: async () => undefined }), (error) => error.code === "invalid-github-webhook");

const duplicateFragment = payload.issue.body.repeat(2);
await assert.rejects(createGitHubIssueRunSubmission({ eventName: "issues",
  deliveryId: "delivery-duplicate", payload: { ...payload,
    issue: { ...payload.issue, body: duplicateFragment } },
  resolveBaseRevision: async () => "a".repeat(40), submitRun: async () => undefined,
  dispatchRun: async () => undefined }), (error) => error.code === "invalid-github-webhook");

const strayMarker = `${payload.issue.body}\n<!-- patch-pilot:expected-failure -->`;
await assert.rejects(createGitHubIssueRunSubmission({ eventName: "issues",
  deliveryId: "delivery-stray", payload: { ...payload,
    issue: { ...payload.issue, body: strayMarker } },
  resolveBaseRevision: async () => "a".repeat(40), submitRun: async () => undefined,
  dispatchRun: async () => undefined }), (error) => error.code === "invalid-github-webhook");

const markerOnlyBody = "<!-- patch-pilot:expected-failure -->failure<!-- /patch-pilot:expected-failure -->";
await assert.rejects(createGitHubIssueRunSubmission({ eventName: "issues",
  deliveryId: "delivery-no-context", payload: { ...payload,
    issue: { ...payload.issue, body: markerOnlyBody } },
  resolveBaseRevision: async () => "a".repeat(40), submitRun: async () => undefined,
  dispatchRun: async () => undefined }), (error) => error.code === "invalid-github-webhook");

await assert.rejects(createGitHubIssueRunSubmission({ eventName: "issues",
  deliveryId: "delivery-long-title", payload: { ...payload,
    issue: { ...payload.issue, title: "x".repeat(501) } },
  resolveBaseRevision: async () => "a".repeat(40), submitRun: async () => undefined,
  dispatchRun: async () => undefined }), (error) => error.code === "invalid-github-webhook");

const ignoredResult = await createGitHubIssueRunSubmission({
  eventName: "issues",
  deliveryId: "delivery-ignored",
  payload: { action: "opened" },
  resolveBaseRevision: async () => {
    throw new Error("Ignored events must not resolve a revision.");
  },
  submitRun: async () => {
    throw new Error("Ignored events must not submit a run.");
  },
  dispatchRun: async () => {
    throw new Error("Ignored events must not dispatch a run.");
  },
});
assert.deepEqual(ignoredResult, {
  status: "ignored",
  reason: "run-not-requested",
});
