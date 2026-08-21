/**
 * Waits durably for one human decision bound to persisted review evidence.
 *
 * @param {{ run: object, review: object, recordTimelineEvent: Function, waitForApproval: Function, now: Function }} input Run, snapshot, and workflow ports.
 * @returns {Promise<object>} Valid approved or rejected decision.
 */
export async function awaitRunApproval(input) {
  await recordApprovalEvent(input, "waiting", { reviewBinding: input.review.reviewBinding });
  const decision = await input.waitForApproval(input.review.reviewBinding);
  assertApprovalDecision(decision, input.run.id, input.review.reviewBinding);
  await recordApprovalEvent(input, decision.status, summarizeApprovalDecision(decision));
  return decision;
}

/** Requires a persisted human decision for this run and exact review evidence. */
function assertApprovalDecision(decision, runId, binding) {
  const hasIdentity = decision?.runId === runId
    && typeof decision?.actorId === "string" && decision.actorId.trim() !== ""
    && typeof decision?.idempotencyKey === "string" && decision.idempotencyKey.trim() !== "";
  const hasDecision = ["approved", "rejected"].includes(decision?.status)
    && (decision.status !== "rejected"
      || (typeof decision.reason === "string" && decision.reason.trim() !== ""));
  const hasTime = typeof decision?.decidedAt === "string"
    && Number.isFinite(Date.parse(decision.decidedAt));
  if (!hasIdentity || !hasDecision || !hasTime
    || !hasSameReviewBinding(decision.reviewBinding, binding)) {
    throw new Error("Approval wait returned an invalid or mismatched decision.");
  }
}

/** Compares the complete evidence identity protected by human approval. */
function hasSameReviewBinding(candidate, expected) {
  return candidate?.baseRevision === expected.baseRevision
    && candidate?.diffHash === expected.diffHash
    && candidate?.planVersion === expected.planVersion
    && candidate?.verification?.status === expected.verification.status
    && candidate?.verification?.evidenceHash === expected.verification.evidenceHash;
}

/** Removes the idempotency key while retaining human audit evidence. */
function summarizeApprovalDecision(decision) {
  return Object.freeze({ status: decision.status, actorId: decision.actorId,
    decidedAt: decision.decidedAt,
    ...(decision.status === "rejected" ? { reason: decision.reason } : {}) });
}

/** Records one deterministic bounded approval-phase event. */
function recordApprovalEvent(input, step, payload) {
  return input.recordTimelineEvent(Object.freeze({
    eventId: `${input.run.id}:timeline:approval-${step}`,
    runId: input.run.id, type: `run.approval.${step}`,
    occurredAt: input.now(), payload: Object.freeze(payload),
  }));
}
