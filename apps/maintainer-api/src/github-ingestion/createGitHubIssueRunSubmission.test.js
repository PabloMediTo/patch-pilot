import assert from "node:assert/strict";

import { createGitHubIssueRunSubmission } from "./index.js";

const payload = {
  action: "labeled",
  label: { name: "patch-pilot" },
  installation: { id: 17 },
  repository: { full_name: "octo/example", default_branch: "main" },
  issue: { number: 42 },
  sender: { id: 23 },
};
const submittedRuns = [];

const result = await createGitHubIssueRunSubmission({
  eventName: "issues",
  deliveryId: "delivery-123",
  payload,
  resolveBaseRevision: async () => "a".repeat(40),
  submitRun: async (run) => { submittedRuns.push(run); return { status: "created", run }; },
});

assert.equal(result.status, "accepted");
assert.deepEqual(submittedRuns, [
  {
    id: "github:delivery-123",
    installationId: 17,
    repository: "octo/example",
    issueNumber: 42,
    defaultBranch: "main",
    baseRevision: "a".repeat(40),
    actorId: 23,
    sourceDeliveryId: "delivery-123",
    status: "submitted",
  },
]);

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
});
assert.deepEqual(ignoredResult, {
  status: "ignored",
  reason: "run-not-requested",
});
