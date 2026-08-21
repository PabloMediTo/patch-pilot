import { awaitRunApproval } from "./awaitRunApproval.js";
import { deliverApprovedProposal } from "./deliverApprovedProposal.js";

/**
 * Orchestrates durable inspection, reproduction, context, and proposal phases.
 *
 * @param {{ run: object, recordTimelineEvent: Function, inspectRepository: Function, reproduceIssue: Function, collectPlanningContext: Function, createProposal: Function, executeProposalAttempts: Function, recordReviewSnapshot: Function, waitForApproval: Function, deliverApprovedPullRequest: Function, now: Function }} input Persisted run and deterministic workflow ports.
 * @returns {Promise<object>} Proposal or terminal workflow outcome.
 */
export async function orchestrateMaintenanceRun(input) {
  assertPersistedRun(input?.run);
  await input.recordTimelineEvent(createEvent({ run: input.run, step: "submitted",
    occurredAt: input.run.submittedAt, payload: { status: "submitted" } }));
  const inspection = await runInspectionPhase(input);
  if (inspection.status !== "supported") {
    await recordEvent(input, "reproduction-skipped", { reason: inspection.reason });
    await recordTerminalOutcome(input, "unsupported", inspection.reason);
    return Object.freeze({ status: "unsupported", runId: input.run.id, inspection });
  }
  const reproduction = await runReproductionPhase(input);
  return finishReproduction(input, inspection, reproduction);
}

/** Gates terminal reproduction outcomes and collects planning context after acceptance. */
async function finishReproduction(input, inspection, reproduction) {
  if (reproduction.status !== "reproduced") {
    await recordTerminalOutcome(input, reproduction.status, reproduction.reason);
    return Object.freeze({ status: reproduction.status, runId: input.run.id,
      inspection, reproduction });
  }
  const repositoryContext = await runPlanningContextPhase(input);
  if (repositoryContext.status !== "ready") {
    await recordTerminalOutcome(input, "planning-context-unavailable", repositoryContext.reason);
    return Object.freeze({ status: "planning-context-unavailable", runId: input.run.id,
      inspection, reproduction, repositoryContext });
  }
  await recordEvent(input, "planning-ready", { reproduction: "reproduced",
    relevantFileCount: repositoryContext.relevantFiles.length,
    totalBytes: repositoryContext.totalBytes });
  return finishPlanning(input, { inspection, reproduction, repositoryContext });
}

/** Generates a proposal and advances every safe proposal through bounded attempts. */
async function finishPlanning(input, evidence) {
  const { inspection, reproduction, repositoryContext } = evidence;
  const proposal = await runProposalPhase(input, reproduction, repositoryContext);
  if (proposal.status === "blocked") {
    await recordTerminalOutcome(input, "proposal-blocked", proposal.safety.reasons.join(","));
    return Object.freeze({ status: "proposal-blocked", runId: input.run.id,
      inspection, reproduction, repositoryContext, proposal });
  }
  await recordEvent(input, "proposal-ready", summarizeProposal(proposal));
  const attemptResult = await runAttemptPhase(input, { inspection, reproduction,
    repositoryContext, proposal });
  if (attemptResult.status !== "completed") {
    await recordTerminalOutcome(input, `attempts-${attemptResult.status}`);
    return Object.freeze({ status: `attempts-${attemptResult.status}`, runId: input.run.id,
      inspection, reproduction, repositoryContext, proposal: attemptResult.proposal,
      attempts: attemptResult.attempts });
  }
  await recordEvent(input, "attempts-accepted", summarizeAttemptResult(attemptResult));
  return finishAcceptedAttempts(input, { inspection, reproduction, repositoryContext },
    attemptResult);
}

/** Records accepted attempt evidence and advances through human approval. */
async function finishAcceptedAttempts(input, evidence, attemptResult) {
  const review = await runReviewPhase(input, attemptResult);
  const approval = await awaitRunApproval({ ...input, review });
  if (approval.status === "rejected") {
    await recordTerminalOutcome(input, "approval-rejected", approval.reason);
    return Object.freeze({ status: "approval-rejected", runId: input.run.id,
      ...evidence, proposal: attemptResult.proposal,
      attempts: attemptResult.attempts, review, approval });
  }
  const delivery = await deliverApprovedProposal({ ...input, attemptResult, review, approval,
    recordEvent: (step, payload) => recordEvent(input, step, payload) });
  const status = ["created", "replayed"].includes(delivery.status)
    ? "delivered" : `delivery-${delivery.status}`;
  if (status !== "delivered") {
    await recordTerminalOutcome(input, status, delivery.reason);
  }
  return Object.freeze({ status, runId: input.run.id, ...evidence,
    proposal: attemptResult.proposal, attempts: attemptResult.attempts,
    review, approval, delivery });
}

/** Persists the accepted final attempt as the immutable approval gate. */
async function runReviewPhase(input, attemptResult) {
  const finalAttempt = attemptResult.attempts.at(-1);
  await recordEvent(input, "review-started", {
    planVersion: finalAttempt.proposal.plan.version,
  });
  try {
    const outcome = await input.recordReviewSnapshot({ run: input.run,
      proposal: finalAttempt.proposal, verification: finalAttempt.verification,
      critique: finalAttempt.critique, recordedAt: input.now() });
    assertReviewOutcome(outcome);
    await recordEvent(input, "review-ready", summarizeReviewOutcome(outcome));
    return outcome.snapshot;
  } catch (error) {
    await recordEvent(input, "review-failed", { message: safeMessage(error) });
    throw error;
  }
}

/** Executes and validates the bounded modification-verification-critique loop. */
async function runAttemptPhase(input, evidence) {
  await recordEvent(input, "attempts-started", { planVersion: evidence.proposal.plan.version });
  try {
    const result = await input.executeProposalAttempts({ run: input.run, ...evidence });
    assertAttemptResult(result);
    await recordEvent(input, "attempts-completed", summarizeAttemptResult(result));
    return result;
  } catch (error) {
    await recordEvent(input, "attempts-failed", { message: safeMessage(error) });
    throw error;
  }
}

/** Generates and validates one bounded proposal with explicit lifecycle evidence. */
async function runProposalPhase(input, reproduction, repositoryContext) {
  await recordEvent(input, "proposal-started", { contextFileCount: repositoryContext.relevantFiles.length });
  try {
    const proposal = await input.createProposal({ run: input.run, reproduction, repositoryContext });
    assertProposal(proposal);
    await recordEvent(input, "proposal-completed", summarizeProposal(proposal));
    return proposal;
  } catch (error) {
    await recordEvent(input, "proposal-failed", { message: safeMessage(error) });
    throw error;
  }
}

/** Collects bounded planning context with explicit lifecycle evidence. */
async function runPlanningContextPhase(input) {
  await recordEvent(input, "planning-context-started", { issueTitle: input.run.issueTitle });
  try {
    const repositoryContext = await input.collectPlanningContext(input.run);
    assertPlanningContext(repositoryContext);
    await recordEvent(input, "planning-context-completed",
      { repositoryContext: summarizePlanningContext(repositoryContext) });
    return repositoryContext;
  } catch (error) {
    await recordEvent(input, "planning-context-failed", { message: safeMessage(error) });
    throw error;
  }
}

/** Runs inspection with explicit start, completion, and failure evidence. */
async function runInspectionPhase(input) {
  await recordEvent(input, "inspection-started", createTarget(input.run));
  try {
    const inspection = await input.inspectRepository(input.run);
    await recordEvent(input, "inspection-completed", { inspection });
    return inspection;
  } catch (error) {
    await recordEvent(input, "inspection-failed", { message: safeMessage(error) });
    throw error;
  }
}

/** Runs reproduction with explicit start, completion, and failure evidence. */
async function runReproductionPhase(input) {
  await recordEvent(input, "reproduction-started", { expectedFailure: input.run.expectedFailure });
  try {
    const reproduction = await input.reproduceIssue(input.run);
    assertReproductionOutcome(reproduction);
    await recordEvent(input, "reproduction-completed", { reproduction });
    return reproduction;
  } catch (error) {
    await recordEvent(input, "reproduction-failed", { message: safeMessage(error) });
    throw error;
  }
}

/** Records one explicit non-planning terminal workflow outcome. */
function recordTerminalOutcome(input, outcome, reason) {
  return recordEvent(input, "terminal", { outcome,
    ...(typeof reason === "string" && reason !== "" ? { reason } : {}) });
}

/** Records one workflow-time event with a deterministic identity. */
function recordEvent(input, step, payload) {
  return input.recordTimelineEvent(createEvent({ run: input.run, step,
    occurredAt: input.now(), payload }));
}

/** Creates one stable workflow-owned timeline event command. */
function createEvent(input) {
  return Object.freeze({ eventId: `${input.run.id}:timeline:${input.step}`,
    runId: input.run.id,
    type: input.step === "submitted" ? "run.submitted"
      : `run.${input.step.replaceAll("-", ".")}`,
    occurredAt: input.occurredAt, payload: Object.freeze(input.payload) });
}

/** Selects immutable repository evidence for the inspection-started event. */
function createTarget(run) {
  return Object.freeze({ repository: run.repository, issueNumber: run.issueNumber,
    baseRevision: run.baseRevision });
}

/** Requires the canonical Postgres row supplied by workflow submission. */
function assertPersistedRun(run) {
  const hasIdentity = typeof run?.id === "string" && run.id.trim() !== ""
    && Number.isInteger(run.installationId) && run.installationId > 0
    && typeof run.repository === "string" && run.repository.trim() !== ""
    && typeof run.defaultBranch === "string" && run.defaultBranch.trim() !== ""
    && typeof run.baseRevision === "string" && /^[0-9a-f]{40}$/u.test(run.baseRevision)
    && typeof run.issueTitle === "string" && run.issueTitle.trim() !== ""
    && run.issueTitle.length <= 500 && typeof run.issueContext === "string"
    && run.issueContext.trim() !== "" && run.issueContext.length <= 8000
    && typeof run.expectedFailure === "string" && run.expectedFailure.trim() !== ""
    && run.expectedFailure.length <= 500;
  if (!hasIdentity || run.status !== "submitted" || Number(run.issueNumber) < 1
    || Number.isNaN(Date.parse(run.submittedAt))) {
    throw new Error("Maintenance workflow requires one persisted submitted run.");
  }
}

/** Requires one recognized Activity-owned reproduction classification. */
function assertReproductionOutcome(reproduction) {
  const statuses = new Set(["reproduced", "not-reproduced", "different-failure",
    "execution-failed", "unsupported"]);
  if (!statuses.has(reproduction?.status)) {
    throw new Error("Reproduction Activity returned an invalid outcome.");
  }
}

/** Requires one bounded planning-context Activity result. */
function assertPlanningContext(context) {
  const files = context?.relevantFiles;
  const hasValidFiles = Array.isArray(files) && files.length > 0 && files.length <= 12
    && files.every(hasValidContextFile) && new Set(files.map((file) => file.path)).size === files.length;
  const measuredBytes = hasValidFiles
    ? files.reduce((total, file) => total + file.byteLength, 0) : -1;
  const hasReadyContext = context?.status === "ready" && Array.isArray(context.relevantFiles)
    && hasValidFiles && context.totalBytes === measuredBytes && context.totalBytes <= 131_072
    && Number.isInteger(context.candidateCount) && context.candidateCount >= files.length
    && context.candidateCount <= 200;
  const hasUnsupportedContext = context?.status === "unsupported"
    && typeof context.reason === "string" && context.reason.trim() !== "";
  if (!hasReadyContext && !hasUnsupportedContext) {
    throw new Error("Planning-context Activity returned an invalid outcome.");
  }
}

/** Checks one bounded repository text entry returned by the Activity. */
function hasValidContextFile(file) {
  return typeof file?.path === "string" && file.path.trim() !== ""
    && typeof file.content === "string" && Number.isInteger(file.byteLength)
    && file.byteLength >= 0 && file.byteLength <= 32_768;
}

/** Removes source content from the live timeline while retaining selection evidence. */
function summarizePlanningContext(context) {
  if (context.status !== "ready") return Object.freeze({ ...context });
  return Object.freeze({ status: "ready", totalBytes: context.totalBytes,
    candidateCount: context.candidateCount,
    relevantFiles: Object.freeze(context.relevantFiles.map((file) => Object.freeze({
      path: file.path, byteLength: file.byteLength,
    }))) });
}

/** Requires a bounded proposal Activity result owned by the maintenance package. */
function assertProposal(proposal) {
  const statuses = new Set(["ready", "blocked"]);
  const hasPlan = Number.isInteger(proposal?.plan?.version) && proposal.plan.version > 0
    && typeof proposal.plan.summary === "string" && proposal.plan.summary.trim() !== ""
    && Array.isArray(proposal.plan.steps) && proposal.plan.steps.length > 0
    && proposal.plan.steps.length <= 8;
  const hasDiff = typeof proposal?.sourceDiff?.unifiedDiff === "string"
    && proposal.sourceDiff.unifiedDiff.trim() !== "" && Array.isArray(proposal.sourceDiff.changes);
  const hasSafety = proposal?.safety?.status === (proposal?.status === "ready" ? "allowed" : "blocked")
    && Array.isArray(proposal?.safety?.reasons);
  if (!statuses.has(proposal?.status) || !hasPlan || !hasDiff || !hasSafety) {
    throw new Error("Proposal Activity returned an invalid outcome.");
  }
}

/** Removes the source diff while retaining plan and changed-file evidence. */
function summarizeProposal(proposal) {
  return Object.freeze({ status: proposal.status, planVersion: proposal.plan.version,
    summary: proposal.plan.summary, plannedFiles: Object.freeze(proposal.plan.steps
      .flatMap((step) => step.files)), changes: proposal.sourceDiff.changes,
    safety: proposal.safety });
}

/** Requires one bounded attempt-loop result from the Activity. */
function assertAttemptResult(result) {
  const statuses = new Set(["completed", "rejected", "exhausted"]);
  const hasAttempts = Array.isArray(result?.attempts) && result.attempts.length > 0
    && result.attempts.length <= 3 && result.attempts.every(hasValidAttempt);
  const finalAttempt = hasAttempts ? result.attempts.at(-1) : undefined;
  if (!statuses.has(result?.status) || !hasAttempts
    || result?.proposal?.plan?.version !== finalAttempt.proposal.plan.version
    || !hasMatchingTerminalAttempt(result.status, finalAttempt)) {
    throw new Error("Proposal-attempt Activity returned an invalid outcome.");
  }
}

/** Requires one idempotently persisted review snapshot with exact binding evidence. */
function assertReviewOutcome(outcome) {
  const snapshot = outcome?.snapshot;
  const hasBinding = /^[0-9a-f]{40}$/u.test(snapshot?.reviewBinding?.baseRevision)
    && /^[0-9a-f]{64}$/u.test(snapshot?.reviewBinding?.diffHash)
    && Number.isInteger(snapshot?.reviewBinding?.planVersion)
    && snapshot.reviewBinding.planVersion > 0
    && snapshot?.reviewBinding?.verification?.status === "passed"
    && /^[0-9a-f]{64}$/u.test(snapshot.reviewBinding.verification.evidenceHash);
  if (!["created", "existing"].includes(outcome?.status)
    || snapshot?.run?.status !== "awaiting-approval" || !hasBinding) {
    throw new Error("Review snapshot Activity returned an invalid outcome.");
  }
}


/** Removes plan, diff, and command output while retaining approval identity. */
function summarizeReviewOutcome(outcome) {
  return Object.freeze({ persistence: outcome.status,
    reviewBinding: outcome.snapshot.reviewBinding,
    recordedAt: outcome.snapshot.recordedAt });
}

/** Ensures the result label agrees with the final critique and verification. */
function hasMatchingTerminalAttempt(status, attempt) {
  if (status === "completed") {
    return attempt.verification.status === "passed" && attempt.critique.decision === "accepted";
  }
  if (status === "rejected") return attempt.critique.decision === "rejected";
  return status === "exhausted" && attempt.critique.decision === "retry";
}

/** Checks one visible attempt without trusting unbounded source data. */
function hasValidAttempt(attempt, index) {
  return attempt?.attemptNumber === index + 1 && attempt?.proposal?.status === "ready"
    && Number.isInteger(attempt?.proposal?.plan?.version)
    && ["passed", "failed", "execution-failed"].includes(attempt?.verification?.status)
    && ["accepted", "retry", "rejected"].includes(attempt?.critique?.decision);
}

/** Removes source diffs while retaining plan, verification, and critique evidence. */
function summarizeAttemptResult(result) {
  return Object.freeze({ status: result.status, attemptCount: result.attempts.length,
    attempts: Object.freeze(result.attempts.map((attempt) => Object.freeze({
      attemptNumber: attempt.attemptNumber, planVersion: attempt.proposal.plan.version,
      changes: attempt.proposal.sourceDiff.changes,
      verification: attempt.verification, critique: attempt.critique,
    }))) });
}

/** Converts an Activity failure to bounded timeline evidence. */
function safeMessage(error) {
  return error instanceof Error && error.message.trim() !== "" ? error.message.slice(0, 500)
    : "Maintenance workflow Activity failed.";
}
