import assert from "node:assert/strict";

import { createGitHubDeliveryActivityRuntime } from "./index.js";

const approval = Object.freeze({ runId: "run-1", status: "approved",
  decidedAt: "2026-08-21T10:00:00.000Z", reviewBinding: Object.freeze({
    baseRevision: "a".repeat(40), diffHash: "773f5314a975067102ef96bbdbf9f866d5ea8eac681a9e39caf87bfaadcedbb6",
    planVersion: 1, verification: Object.freeze({ status: "passed",
      evidenceHash: "b".repeat(64) }),
  }) });
const saved = [];
const pool = { closeCalls: 0, async query() { return { rows: [] }; },
  async end() { this.closeCalls += 1; } };
const runtime = await createGitHubDeliveryActivityRuntime({ pool,
  provider: { publishBranch: async () => ({ headRevision: "c".repeat(40) }),
    ensureDraftPullRequest: async () => ({ number: 7,
      url: "https://github.com/octo/example/pull/7", draft: true }) },
  approvalStore: { get: async () => approval },
  deliveryStore: { get: async () => null, saveDelivery: async (delivery) => {
    saved.push(delivery);
    return { status: "created", delivery };
  } }, clock: () => new Date("2026-08-21T10:01:00.000Z") });
const result = await runtime.deliverApprovedPullRequest({ runId: "run-1", installationId: 17,
  repository: "octo/example", issueNumber: 42, baseBranch: "main", proposal: {
    baseRevision: approval.reviewBinding.baseRevision, planVersion: 1,
    sourceDiff: "approved source diff", title: "Fix issue 42", body: "Correct addition.",
    verification: approval.reviewBinding.verification,
  } });

assert.equal(result.status, "created");
assert.equal(saved[0].pullRequest.number, 7);
assert.equal(saved[0].proposalBinding.diffHash, approval.reviewBinding.diffHash);
await assert.rejects(runtime.deliverApprovedPullRequest({ runId: "" }), /run identity/u);
await runtime.close();
await runtime.close();
assert.equal(pool.closeCalls, 1);
await assert.rejects(runtime.deliverApprovedPullRequest({ runId: "run-1" }), /closed/u);

const failedPool = { closeCalls: 0, async query() { return { rows: [] }; },
  async end() { this.closeCalls += 1; } };
await assert.rejects(createGitHubDeliveryActivityRuntime({ pool: failedPool }),
  /storage and GitHub App/u);
assert.equal(failedPool.closeCalls, 1);
