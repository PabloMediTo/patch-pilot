import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import { createGitHubIssueRunSubmission } from "./index.js";

const secret = "test-secret";
const rawBody = JSON.stringify({
  action: "labeled",
  label: { name: "patch-pilot" },
  installation: { id: 17 },
  repository: { full_name: "octo/example", default_branch: "main" },
  issue: { number: 42 },
  sender: { id: 23 },
});
const signature = `sha256=${createHmac("sha256", secret)
  .update(rawBody, "utf8")
  .digest("hex")}`;
const submittedRuns = [];

const result = await createGitHubIssueRunSubmission({
  eventName: "issues",
  deliveryId: "delivery-123",
  rawBody,
  signature,
  secret,
  resolveBaseRevision: async () => "abc123",
  submitRun: async (run) => submittedRuns.push(run),
});

assert.equal(result.status, "accepted");
assert.deepEqual(submittedRuns, [
  {
    id: "github:delivery-123",
    installationId: 17,
    repository: "octo/example",
    issueNumber: 42,
    defaultBranch: "main",
    baseRevision: "abc123",
    actorId: 23,
    sourceDeliveryId: "delivery-123",
    status: "submitted",
  },
]);

await assert.rejects(
  createGitHubIssueRunSubmission({
    eventName: "issues",
    deliveryId: "delivery-tampered",
    rawBody,
    signature: "sha256=invalid",
    secret,
    resolveBaseRevision: async () => "abc123",
    submitRun: async (run) => submittedRuns.push(run),
  }),
  /Invalid GitHub webhook signature/,
);
assert.equal(submittedRuns.length, 1);

const ignoredBody = JSON.stringify({ action: "opened" });
const ignoredSignature = `sha256=${createHmac("sha256", secret)
  .update(ignoredBody, "utf8")
  .digest("hex")}`;
const ignoredResult = await createGitHubIssueRunSubmission({
  eventName: "issues",
  deliveryId: "delivery-ignored",
  rawBody: ignoredBody,
  signature: ignoredSignature,
  secret,
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
