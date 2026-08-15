import { createHash } from "node:crypto";

const FULL_REVISION = /^[0-9a-f]{40}$/u;
const EVIDENCE_HASH = /^[0-9a-f]{64}$/u;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;

/**
 * Publishes one exactly approved proposal as an idempotent branch and draft pull request.
 *
 * @param {{ runId: string, installationId: number, repository: string, issueNumber: number, baseBranch: string, proposal: object, approval: object, loadDelivery: Function, publishBranch: Function, ensureDraftPullRequest: Function, saveDelivery: Function, clock: Function }} input Delivery evidence and outbound ports.
 * @returns {Promise<object>} Created, replayed, blocked, or conflicting delivery outcome.
 */
export async function publishApprovedPullRequest(input) {
  assertDeliveryInput(input);
  const intent = createDeliveryIntent(input);
  const approvalGate = assessApproval(input.approval, intent.proposalBinding);
  if (approvalGate !== null) return approvalGate;

  const existing = await input.loadDelivery(input.runId);
  if (existing !== null) return replayExisting(existing, intent);

  const branch = await input.publishBranch(createBranchRequest(intent, input.proposal.sourceDiff));
  assertPublishedBranch(branch);
  const pullRequest = await input.ensureDraftPullRequest(createPullRequestRequest(intent));
  assertDraftPullRequest(pullRequest, intent.repository);
  const delivery = createDeliveryEvidence({ intent, branch, pullRequest, clock: input.clock });
  return normalizeSaveResult(await input.saveDelivery(delivery), delivery, intent);
}

/** Validates stable delivery identifiers, content, and integration ports. */
function assertDeliveryInput(input) {
  const hasIdentity = typeof input?.runId === "string" && input.runId.trim() !== ""
    && Number.isInteger(input?.installationId) && input.installationId > 0
    && REPOSITORY.test(input?.repository) && Number.isInteger(input?.issueNumber) && input.issueNumber > 0;
  const hasTarget = typeof input?.baseBranch === "string" && input.baseBranch.trim() !== "";
  const hasProposal = FULL_REVISION.test(input?.proposal?.baseRevision)
    && Number.isInteger(input?.proposal?.planVersion) && input.proposal.planVersion > 0
    && typeof input?.proposal?.sourceDiff === "string" && input.proposal.sourceDiff.trim() !== ""
    && typeof input?.proposal?.title === "string" && input.proposal.title.trim() !== ""
    && typeof input?.proposal?.body === "string";
  const ports = [input?.loadDelivery, input?.publishBranch, input?.ensureDraftPullRequest,
    input?.saveDelivery, input?.clock];
  if (!hasIdentity || !hasTarget || !hasProposal || !hasValidVerification(input.proposal.verification)
    || ports.some((port) => typeof port !== "function")) {
    throw new Error("Pull request delivery requires a target, proposal evidence, and idempotent ports.");
  }
}

/** Checks the shape of canonical verification identity. */
function hasValidVerification(verification) {
  return ["passed", "failed", "execution-failed"].includes(verification?.status)
    && EVIDENCE_HASH.test(verification?.evidenceHash);
}

/** Creates the immutable intent used for side effects and replay comparison. */
function createDeliveryIntent(input) {
  const proposalBinding = Object.freeze({
    baseRevision: input.proposal.baseRevision,
    diffHash: createHash("sha256").update(input.proposal.sourceDiff, "utf8").digest("hex"),
    planVersion: input.proposal.planVersion,
    verification: Object.freeze({ ...input.proposal.verification }),
  });
  return Object.freeze({ runId: input.runId, installationId: input.installationId,
    repository: input.repository, issueNumber: input.issueNumber, baseBranch: input.baseBranch,
    branchName: createBranchName(input.runId), proposalBinding,
    title: input.proposal.title.trim(), body: input.proposal.body.trim(),
    approvedAt: input.approval?.decidedAt });
}

/** Creates a safe deterministic Git reference without exposing the run identity. */
function createBranchName(runId) {
  const suffix = createHash("sha256").update(runId, "utf8").digest("hex").slice(0, 24);
  return `patch-pilot/${suffix}`;
}

/** Enforces exact evidence approval before any external side effect. */
function assessApproval(approval, proposalBinding) {
  if (approval?.status !== "approved") {
    return Object.freeze({ status: "blocked", reason: "approval-required" });
  }
  const hasDecisionTime = typeof approval.decidedAt === "string"
    && Number.isFinite(Date.parse(approval.decidedAt));
  return hasDecisionTime && hasMatchingBinding(approval.reviewBinding, proposalBinding)
    ? null
    : Object.freeze({ status: "blocked", reason: "approval-evidence-mismatch" });
}

/** Compares every field that invalidates a prior human approval. */
function hasMatchingBinding(left, right) {
  return left?.baseRevision === right.baseRevision && left?.diffHash === right.diffHash
    && left?.planVersion === right.planVersion
    && left?.verification?.status === "passed"
    && left.verification.status === right.verification.status
    && left.verification.evidenceHash === right.verification.evidenceHash;
}

/** Replays only a durable record for the same exact delivery intent. */
function replayExisting(existing, intent) {
  return hasMatchingIntent(existing, intent)
    ? Object.freeze({ status: "replayed", delivery: existing })
    : Object.freeze({ status: "conflict", reason: "delivery-already-recorded" });
}

/** Compares stable intent fields while ignoring provider-assigned result fields. */
function hasMatchingIntent(delivery, intent) {
  return delivery?.runId === intent.runId && delivery?.installationId === intent.installationId
    && delivery?.repository === intent.repository && delivery?.issueNumber === intent.issueNumber
    && delivery?.baseBranch === intent.baseBranch && delivery?.branchName === intent.branchName
    && hasMatchingBinding(delivery?.proposalBinding, intent.proposalBinding);
}

/** Creates the exact idempotent branch publication request. */
function createBranchRequest(intent, sourceDiff) {
  return Object.freeze({ runId: intent.runId, installationId: intent.installationId,
    repository: intent.repository, branchName: intent.branchName,
    baseRevision: intent.proposalBinding.baseRevision, diffHash: intent.proposalBinding.diffHash,
    approvedAt: intent.approvedAt, sourceDiff });
}

/** Validates the immutable head produced by branch publication. */
function assertPublishedBranch(branch) {
  if (!FULL_REVISION.test(branch?.headRevision)) {
    throw new Error("Branch publisher must return a full immutable head revision.");
  }
}

/** Creates a deterministic draft pull-request request linked to the issue. */
function createPullRequestRequest(intent) {
  const body = `${intent.body}${intent.body === "" ? "" : "\n\n"}Fixes #${intent.issueNumber}`;
  return Object.freeze({ installationId: intent.installationId, repository: intent.repository,
    headBranch: intent.branchName, baseBranch: intent.baseBranch, title: intent.title, body,
    issueNumber: intent.issueNumber, draft: true });
}

/** Rejects a provider response that could represent an unsafe non-draft PR. */
function assertDraftPullRequest(pullRequest, repository) {
  const hasIdentity = Number.isInteger(pullRequest?.number) && pullRequest.number > 0
    && pullRequest?.url === `https://github.com/${repository}/pull/${pullRequest.number}`;
  if (!hasIdentity || pullRequest.draft !== true) {
    throw new Error("GitHub delivery must return an identified draft pull request.");
  }
}

/** Creates durable evidence only after both provider operations succeed. */
function createDeliveryEvidence({ intent, branch, pullRequest, clock }) {
  const deliveredAt = clock();
  if (!(deliveredAt instanceof Date) || Number.isNaN(deliveredAt.valueOf())) {
    throw new Error("Delivery clock must return a valid Date.");
  }
  return Object.freeze({ runId: intent.runId, installationId: intent.installationId,
    repository: intent.repository, issueNumber: intent.issueNumber, baseBranch: intent.baseBranch,
    branchName: intent.branchName, headRevision: branch.headRevision,
    proposalBinding: intent.proposalBinding, pullRequest: Object.freeze({ ...pullRequest }),
    deliveredAt: deliveredAt.toISOString() });
}

/** Normalizes an atomic delivery write or a concurrent matching replay. */
function normalizeSaveResult(result, delivery, intent) {
  if (result?.status === "created") return Object.freeze({ status: "created", delivery });
  if (hasMatchingIntent(result?.delivery, intent)) {
    return Object.freeze({ status: "replayed", delivery: result.delivery });
  }
  return Object.freeze({ status: "conflict", reason: "delivery-write-conflict" });
}
