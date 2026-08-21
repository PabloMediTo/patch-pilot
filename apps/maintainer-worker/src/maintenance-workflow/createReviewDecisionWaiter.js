/**
 * Creates one bounded signal receiver that resolves only an exactly bound review decision.
 *
 * @param {{ runId: string, waitUntil: Function }} input Run identity and durable wait primitive.
 * @returns {{ receive: Function, waitForDecision: Function }} Signal and wait ports.
 */
export function createReviewDecisionWaiter(input) {
  if (typeof input?.runId !== "string" || input.runId.trim() === ""
    || typeof input?.waitUntil !== "function") {
    throw new Error("Review decision waiting requires a run identity and durable condition port.");
  }
  let expectedBinding;
  let pendingDecision;
  let acceptedDecision;

  const acceptWhenMatching = (candidate) => {
    if (acceptedDecision === undefined
      && hasValidDecision(candidate, input.runId, expectedBinding)) {
      acceptedDecision = freezeDecision(candidate);
    }
  };

  return Object.freeze({
    receive: (candidate) => {
      if (acceptedDecision !== undefined) return;
      if (expectedBinding === undefined) pendingDecision = candidate;
      else acceptWhenMatching(candidate);
    },
    waitForDecision: async (binding) => {
      assertReviewBinding(binding);
      if (expectedBinding !== undefined && !hasSameBinding(expectedBinding, binding)) {
        throw new Error("Review decision waiter cannot change its expected binding.");
      }
      expectedBinding = freezeBinding(binding);
      acceptWhenMatching(pendingDecision);
      pendingDecision = undefined;
      await input.waitUntil(() => acceptedDecision !== undefined);
      return acceptedDecision;
    },
  });
}

/** Checks decision identity, rejection evidence, timestamp, and exact review binding. */
function hasValidDecision(candidate, expectedRunId, expectedBinding) {
  const hasIdentity = candidate?.runId === expectedRunId
    && typeof candidate.actorId === "string" && candidate.actorId.trim() !== ""
    && typeof candidate.idempotencyKey === "string" && candidate.idempotencyKey.trim() !== "";
  const hasStatus = ["approved", "rejected"].includes(candidate?.status);
  const hasReason = candidate?.status !== "rejected"
    || (typeof candidate.reason === "string" && candidate.reason.trim() !== "");
  const hasTime = typeof candidate?.decidedAt === "string"
    && Number.isFinite(Date.parse(candidate.decidedAt));
  return expectedBinding !== undefined && hasIdentity && hasStatus && hasReason && hasTime
    && hasSameBinding(candidate.reviewBinding, expectedBinding);
}

/** Requires one complete passed-verification review binding. */
function assertReviewBinding(binding) {
  const isValid = /^[0-9a-f]{40}$/u.test(binding?.baseRevision)
    && /^[0-9a-f]{64}$/u.test(binding?.diffHash)
    && Number.isInteger(binding?.planVersion) && binding.planVersion > 0
    && binding?.verification?.status === "passed"
    && /^[0-9a-f]{64}$/u.test(binding.verification.evidenceHash);
  if (!isValid) throw new Error("Review decision waiting requires an exact review binding.");
}

/** Compares every field that invalidates a prior human decision. */
function hasSameBinding(candidate, expected) {
  return candidate?.baseRevision === expected.baseRevision
    && candidate?.diffHash === expected.diffHash
    && candidate?.planVersion === expected.planVersion
    && candidate?.verification?.status === expected.verification.status
    && candidate?.verification?.evidenceHash === expected.verification.evidenceHash;
}

/** Detaches one accepted signal payload from caller-owned objects. */
function freezeDecision(decision) {
  return Object.freeze({ runId: decision.runId, actorId: decision.actorId,
    idempotencyKey: decision.idempotencyKey, status: decision.status,
    reason: decision.status === "rejected" ? decision.reason.trim() : null,
    decidedAt: new Date(decision.decidedAt).toISOString(),
    reviewBinding: freezeBinding(decision.reviewBinding) });
}

/** Copies and freezes one review binding. */
function freezeBinding(binding) {
  return Object.freeze({ baseRevision: binding.baseRevision, diffHash: binding.diffHash,
    planVersion: binding.planVersion, verification: Object.freeze({
      status: binding.verification.status,
      evidenceHash: binding.verification.evidenceHash,
    }) });
}
