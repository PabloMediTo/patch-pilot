const DECISIONS = Object.freeze(["approved", "rejected"]);

/**
 * Records the first human approval decision for one reviewable run.
 *
 * @param {{ runId: string, actorId: string, idempotencyKey: string, decision: string, reason?: string, decidedAt: string, loadApprovalState: Function, saveFirstDecision: Function }} input Decision and persistence ports.
 * @returns {Promise<object>} Created or idempotently replayed decision.
 */
export async function decideRunApproval(input) {
  assertDecisionInput(input);
  const state = await input.loadApprovalState(input.runId);
  const replay = createReplayOutcome(state?.decision, input.idempotencyKey);
  if (replay !== null) {
    return replay;
  }
  if (state?.runStatus !== "awaiting-approval") {
    return Object.freeze({ status: "conflict", reason: "run-not-awaiting-approval" });
  }

  const reviewBinding = createReviewBinding(state?.reviewBinding);
  const decision = createDecision(input, reviewBinding);
  return normalizeSaveResult(await input.saveFirstDecision(decision), input.idempotencyKey);
}

/** Validates actor-authenticated decision input. */
function assertDecisionInput(input) {
  const hasIdentity = [input?.runId, input?.actorId, input?.idempotencyKey, input?.decidedAt]
    .every((value) => typeof value === "string" && value.trim() !== "");
  const hasDecision = DECISIONS.includes(input?.decision);
  const hasRejectionReason = input?.decision !== "rejected"
    || (typeof input.reason === "string" && input.reason.trim() !== "");
  if (!hasIdentity || !hasDecision || !hasRejectionReason
    || typeof input.loadApprovalState !== "function" || typeof input.saveFirstDecision !== "function") {
    throw new Error("Approval requires an actor, idempotency key, valid decision, and persistence ports.");
  }
}

/** Returns an idempotent replay or a competing-decision conflict. */
function createReplayOutcome(decision, idempotencyKey) {
  if (decision === undefined || decision === null) {
    return null;
  }
  return decision.idempotencyKey === idempotencyKey
    ? Object.freeze({ status: "replayed", decision })
    : Object.freeze({ status: "conflict", reason: "decision-already-recorded" });
}

/** Creates immutable decision evidence for atomic persistence. */
function createDecision(input, reviewBinding) {
  return Object.freeze({
    runId: input.runId,
    actorId: input.actorId,
    idempotencyKey: input.idempotencyKey,
    status: input.decision,
    reason: input.decision === "rejected" ? input.reason.trim() : null,
    decidedAt: input.decidedAt,
    reviewBinding,
  });
}

/** Binds a decision to the exact review evidence loaded from canonical state. */
function createReviewBinding(candidate) {
  const hasBaseRevision = typeof candidate?.baseRevision === "string"
    && /^[0-9a-f]{40}$/u.test(candidate.baseRevision);
  const hasDiffHash = typeof candidate?.diffHash === "string"
    && /^[0-9a-f]{64}$/u.test(candidate.diffHash);
  const hasPlanVersion = Number.isInteger(candidate?.planVersion) && candidate.planVersion > 0;
  const hasPassedVerification = candidate?.verification?.status === "passed"
    && typeof candidate.verification.evidenceHash === "string"
    && /^[0-9a-f]{64}$/u.test(candidate.verification.evidenceHash);
  if (!hasBaseRevision || !hasDiffHash || !hasPlanVersion || !hasPassedVerification) {
    throw new Error("Approval requires exact passed review evidence from canonical run state.");
  }
  return Object.freeze({
    baseRevision: candidate.baseRevision,
    diffHash: candidate.diffHash,
    planVersion: candidate.planVersion,
    verification: Object.freeze({
      status: candidate.verification.status,
      evidenceHash: candidate.verification.evidenceHash,
    }),
  });
}

/** Normalizes the atomic first-writer persistence result. */
function normalizeSaveResult(result, idempotencyKey) {
  if (result?.status === "created") {
    return Object.freeze({ status: "created", decision: result.decision });
  }
  return createReplayOutcome(result?.decision, idempotencyKey)
    ?? Object.freeze({ status: "conflict", reason: "decision-write-conflict" });
}
