import { createHash } from "node:crypto";

const REVISION = /^[0-9a-f]{40}$/u;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;

/**
 * Creates immutable canonical evidence when a run enters human review.
 *
 * @param {{ run: object, proposal: object, verification: object, critique: object, recordedAt: string }} input Accepted final attempt and run identity.
 * @returns {object} Immutable review snapshot and exact approval binding.
 */
export function createRunReviewSnapshot(input) {
  assertInput(input);
  const plan = freezeJson(input.proposal.plan);
  const evidence = freezeJson(input.verification.evidence);
  const critique = freezeJson(input.critique);
  const diff = input.proposal.sourceDiff.unifiedDiff;
  const diffHash = hashText(diff);
  const evidenceHash = hashText(JSON.stringify(evidence));
  return Object.freeze({
    run: Object.freeze({ id: input.run.id, status: "awaiting-approval",
      repository: input.run.repository, issueNumber: input.run.issueNumber,
      baseRevision: input.run.baseRevision }),
    proposal: Object.freeze({ plan, diff, diffHash }),
    verification: Object.freeze({ status: "passed", evidence, evidenceHash }),
    critique,
    reviewBinding: Object.freeze({ baseRevision: input.run.baseRevision, diffHash,
      planVersion: plan.version, verification: Object.freeze({ status: "passed", evidenceHash }) }),
    recordedAt: new Date(input.recordedAt).toISOString(),
  });
}

/** Rejects incomplete or non-accepted attempt evidence before persistence. */
function assertInput(input) {
  const hasRun = typeof input?.run?.id === "string" && input.run.id.trim() !== ""
    && REPOSITORY.test(input?.run?.repository) && Number.isInteger(input?.run?.issueNumber)
    && input.run.issueNumber > 0 && REVISION.test(input?.run?.baseRevision);
  const hasProposal = input?.proposal?.status === "ready"
    && Number.isInteger(input?.proposal?.plan?.version) && input.proposal.plan.version > 0
    && Array.isArray(input.proposal.plan.steps)
    && typeof input?.proposal?.sourceDiff?.unifiedDiff === "string"
    && input.proposal.sourceDiff.unifiedDiff.trim() !== "";
  const hasVerification = input?.verification?.status === "passed"
    && hasExecutionEvidence(input.verification.evidence);
  const hasAcceptance = input?.critique?.decision === "accepted"
    && typeof input?.recordedAt === "string" && Number.isFinite(Date.parse(input.recordedAt));
  if (!hasRun || !hasProposal || !hasVerification || !hasAcceptance) {
    throw new Error("Review snapshot requires one accepted, passed, review-ready attempt.");
  }
}

/** Checks the bounded verification evidence required by the review UI. */
function hasExecutionEvidence(evidence) {
  return typeof evidence?.command?.executable === "string" && Array.isArray(evidence.command.args)
    && Number.isInteger(evidence?.exitCode) && typeof evidence?.stdout === "string"
    && typeof evidence?.stderr === "string" && Number.isFinite(evidence?.durationMs)
    && evidence.durationMs >= 0 && typeof evidence?.hasTimedOut === "boolean"
    && typeof evidence?.hasTruncatedOutput === "boolean";
}

/** Creates an immutable JSON copy detached from caller-owned evidence. */
function freezeJson(value) {
  const copy = JSON.parse(JSON.stringify(value));
  Object.values(copy).forEach((child) => {
    if (child !== null && typeof child === "object") freezeInPlace(child);
  });
  return Object.freeze(copy);
}

/** Recursively freezes one copied JSON subtree. */
function freezeInPlace(value) {
  Object.values(value).forEach((child) => {
    if (child !== null && typeof child === "object") freezeInPlace(child);
  });
  Object.freeze(value);
}

/** Hashes exact UTF-8 review evidence. */
function hashText(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
