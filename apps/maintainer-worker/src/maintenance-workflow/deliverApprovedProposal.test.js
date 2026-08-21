import assert from "node:assert/strict";

import { deliverApprovedProposal } from "./deliverApprovedProposal.js";

const run = Object.freeze({ id: "run-1", installationId: 17, repository: "octo/example",
  issueNumber: 42, defaultBranch: "main", issueTitle: "Correct addition" });
const reviewBinding = Object.freeze({ baseRevision: "a".repeat(40), diffHash: "b".repeat(64),
  planVersion: 2, verification: Object.freeze({ status: "passed",
    evidenceHash: "c".repeat(64) }) });
const input = { run, review: Object.freeze({ reviewBinding }),
  approval: Object.freeze({ status: "approved", decidedAt: "2026-08-21T10:00:00.000Z" }),
  attemptResult: Object.freeze({ attempts: Object.freeze([Object.freeze({
    proposal: Object.freeze({ plan: Object.freeze({ version: 2, summary: "Fix math." }),
      sourceDiff: Object.freeze({ unifiedDiff: "approved diff" }) }),
  })]) }) };

const conflictEvents = [];
const conflict = await deliverApprovedProposal({ ...input,
  deliverApprovedPullRequest: async () => ({ status: "conflict",
    reason: "delivery-already-recorded" }),
  recordEvent: async (step, payload) => { conflictEvents.push({ step, payload }); } });
assert.deepEqual(conflict, { status: "conflict", reason: "delivery-already-recorded" });
assert.deepEqual(conflictEvents.map(({ step }) => step), ["delivery-started", "delivery-conflict"]);
assert.equal(conflictEvents[1].payload.reason, "delivery-already-recorded");

const failedEvents = [];
const providerFailure = new Error("GitHub unavailable");
await assert.rejects(deliverApprovedProposal({ ...input,
  deliverApprovedPullRequest: async () => { throw providerFailure; },
  recordEvent: async (step, payload) => { failedEvents.push({ step, payload }); } }),
(error) => error === providerFailure);
assert.equal(failedEvents.at(-1).step, "delivery-failed");
assert.equal(failedEvents.at(-1).payload.message, "GitHub unavailable");

const invalidEvents = [];
await assert.rejects(deliverApprovedProposal({ ...input,
  deliverApprovedPullRequest: async () => ({ status: "created", delivery: {} }),
  recordEvent: async (step, payload) => { invalidEvents.push({ step, payload }); } }),
/invalid outcome/u);
assert.equal(invalidEvents.at(-1).step, "delivery-failed");
