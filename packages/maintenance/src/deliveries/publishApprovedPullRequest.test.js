import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { publishApprovedPullRequest } from "./index.js";

const sourceDiff = "diff --git a/src/fix.js b/src/fix.js\n@@ -1 +1 @@\n-old\n+fixed";
const proposalBinding = Object.freeze({
  baseRevision: "a".repeat(40),
  diffHash: createHash("sha256").update(sourceDiff, "utf8").digest("hex"),
  planVersion: 2,
  verification: Object.freeze({ status: "passed", evidenceHash: "c".repeat(64) }),
});
const baseInput = {
  runId: "github:delivery-123",
  installationId: 17,
  repository: "octo/example",
  issueNumber: 42,
  baseBranch: "main",
  proposal: { ...proposalBinding, sourceDiff, title: "Fix boundary condition", body: "Verified fix",
    verification: proposalBinding.verification },
  approval: { status: "approved", decidedAt: "2026-08-15T11:55:00.000Z",
    reviewBinding: proposalBinding },
  clock: () => new Date("2026-08-15T12:00:00.000Z"),
};

const calls = [];
let saved;
const created = await publishApprovedPullRequest(createInput({
  publishBranch: async (request) => { calls.push({ type: "branch", request });
    return { headRevision: "d".repeat(40) }; },
  ensureDraftPullRequest: async (request) => { calls.push({ type: "pull-request", request });
    return { number: 84, url: "https://github.com/octo/example/pull/84", draft: true }; },
  saveDelivery: async (delivery) => { calls.push({ type: "save", delivery }); saved = delivery;
    return { status: "created", delivery }; },
}));
assert.equal(created.status, "created");
assert.deepEqual(calls.map(({ type }) => type), ["branch", "pull-request", "save"]);
assert.equal(saved.branchName, `patch-pilot/${createHash("sha256").update(baseInput.runId, "utf8")
  .digest("hex").slice(0, 24)}`);
assert.equal(calls[0].request.sourceDiff, sourceDiff);
assert.equal(calls[0].request.approvedAt, "2026-08-15T11:55:00.000Z");
assert.equal(calls[1].request.draft, true);
assert.match(calls[1].request.body, /Fixes #42$/u);
assert.equal(saved.pullRequest.number, 84);
assert.equal(saved.deliveredAt, "2026-08-15T12:00:00.000Z");

let externalCalls = 0;
const replayed = await publishApprovedPullRequest(createInput({
  loadDelivery: async () => saved,
  publishBranch: async () => { externalCalls += 1; },
  ensureDraftPullRequest: async () => { externalCalls += 1; },
  saveDelivery: async () => { externalCalls += 1; },
}));
assert.equal(replayed.status, "replayed");
assert.equal(externalCalls, 0);

const rejected = await publishApprovedPullRequest(createInput({ approval: { status: "rejected" } }));
assert.deepEqual(rejected, { status: "blocked", reason: "approval-required" });
const legacyApproval = await publishApprovedPullRequest(createInput({
  approval: { status: "approved", reviewBinding: null },
}));
assert.deepEqual(legacyApproval, { status: "blocked", reason: "approval-evidence-mismatch" });
const undatedApproval = await publishApprovedPullRequest(createInput({
  approval: { status: "approved", reviewBinding: proposalBinding },
}));
assert.deepEqual(undatedApproval, { status: "blocked", reason: "approval-evidence-mismatch" });
const changedDiff = await publishApprovedPullRequest(createInput({
  proposal: { ...baseInput.proposal, sourceDiff: `${sourceDiff}\n+later change` },
}));
assert.deepEqual(changedDiff, { status: "blocked", reason: "approval-evidence-mismatch" });

await assert.rejects(publishApprovedPullRequest(createInput({
  ensureDraftPullRequest: async () => ({ number: 84,
    url: "https://github.com/octo/example/pull/84", draft: false }),
})), /draft pull request/u);

const raced = await publishApprovedPullRequest(createInput({
  saveDelivery: async () => ({ status: "existing", delivery: saved }),
}));
assert.equal(raced.status, "replayed");

const conflicting = await publishApprovedPullRequest(createInput({
  loadDelivery: async () => ({ ...saved, issueNumber: 99 }),
}));
assert.deepEqual(conflicting, { status: "conflict", reason: "delivery-already-recorded" });

/** Creates one delivery use-case fixture with idempotent provider defaults. */
function createInput(overrides = {}) {
  return { ...baseInput, ...overrides,
    proposal: overrides.proposal ?? baseInput.proposal,
    approval: overrides.approval ?? baseInput.approval,
    loadDelivery: overrides.loadDelivery ?? (async () => null),
    publishBranch: overrides.publishBranch ?? (async () => ({ headRevision: "d".repeat(40) })),
    ensureDraftPullRequest: overrides.ensureDraftPullRequest ?? (async () => ({ number: 84,
      url: "https://github.com/octo/example/pull/84", draft: true })),
    saveDelivery: overrides.saveDelivery ?? (async (delivery) => ({ status: "created", delivery })) };
}
