const SIGNAL_NAME = "reviewDecision";

/**
 * Creates a Temporal signal port for already persisted approval decisions.
 *
 * @param {{ client: object }} input Reusable Temporal client.
 * @returns {Function} Persisted-decision notification operation.
 */
export function createTemporalApprovalNotifier(input) {
  if (typeof input?.client?.workflow?.getHandle !== "function") {
    throw new Error("Temporal approval notification requires a workflow client.");
  }
  return async function notifyApprovalDecision(decision) {
    assertPersistedDecision(decision);
    const handle = input.client.workflow.getHandle(decision.runId);
    if (typeof handle?.signal !== "function") {
      throw new Error("Temporal workflow handle cannot receive approval signals.");
    }
    await handle.signal(SIGNAL_NAME, decision);
    return Object.freeze({ status: "signaled", workflowId: decision.runId,
      signalName: SIGNAL_NAME });
  };
}

/** Requires the complete canonical first-writer decision before signaling. */
function assertPersistedDecision(decision) {
  const hasIdentity = typeof decision?.runId === "string" && decision.runId.trim() !== ""
    && typeof decision.actorId === "string" && decision.actorId.trim() !== ""
    && typeof decision.idempotencyKey === "string" && decision.idempotencyKey.trim() !== "";
  const hasDecision = ["approved", "rejected"].includes(decision?.status)
    && (decision.status !== "rejected"
      || (typeof decision.reason === "string" && decision.reason.trim() !== ""));
  const hasTime = typeof decision?.decidedAt === "string"
    && Number.isFinite(Date.parse(decision.decidedAt));
  const binding = decision?.reviewBinding;
  const hasBinding = /^[0-9a-f]{40}$/u.test(binding?.baseRevision)
    && /^[0-9a-f]{64}$/u.test(binding?.diffHash)
    && Number.isInteger(binding?.planVersion) && binding.planVersion > 0
    && binding?.verification?.status === "passed"
    && /^[0-9a-f]{64}$/u.test(binding.verification.evidenceHash);
  if (!hasIdentity || !hasDecision || !hasTime || !hasBinding) {
    throw new Error("Temporal approval notification requires one persisted bound decision.");
  }
}
