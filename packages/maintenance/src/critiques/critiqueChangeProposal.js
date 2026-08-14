const ALLOWED_DECISIONS = Object.freeze(["accepted", "retry", "rejected"]);
const ALLOWED_SEVERITIES = Object.freeze(["warning", "blocking"]);

/**
 * Critiques a verified proposal and returns a bounded review decision.
 *
 * @param {{ proposal: object, verification: object, reviewProposal: Function }} input Proposal, verification evidence, and reviewer port.
 * @returns {Promise<object>} Immutable accepted, retry, or rejected critique.
 * @throws {Error} When reviewer output is malformed.
 */
export async function critiqueChangeProposal(input) {
  if (input?.proposal?.status !== "ready") {
    return createDeterministicCritique("rejected", "proposal-not-ready");
  }
  if (input?.verification?.status === "execution-failed") {
    return createDeterministicCritique("rejected", "verification-execution-failed");
  }
  if (input?.verification?.status === "failed") {
    return createDeterministicCritique("retry", "verification-failed");
  }
  if (input?.verification?.status !== "passed" || typeof input?.reviewProposal !== "function") {
    throw new Error("Critique requires valid passing verification and a reviewer port.");
  }

  const candidate = await input.reviewProposal(Object.freeze({
    plan: input.proposal.plan,
    sourceDiff: input.proposal.sourceDiff,
    safety: input.proposal.safety,
    verification: input.verification,
  }));
  return createGeneratedCritique(candidate);
}

/**
 * Creates a deterministic critique without invoking a reviewer.
 *
 * @param {string} decision Review decision.
 * @param {string} reason Stable reason code.
 * @returns {object} Immutable critique.
 */
function createDeterministicCritique(decision, reason) {
  return Object.freeze({ decision, reason, findings: Object.freeze([]) });
}

/**
 * Validates and freezes structured reviewer output.
 *
 * @param {unknown} candidate Reviewer output.
 * @returns {object} Immutable critique.
 * @throws {Error} When output is invalid or contradicts blocking findings.
 */
function createGeneratedCritique(candidate) {
  const hasDecision = ALLOWED_DECISIONS.includes(candidate?.decision);
  const hasRationale = typeof candidate?.rationale === "string" && candidate.rationale.trim() !== "";
  const hasFindings = Array.isArray(candidate?.findings);
  if (!hasDecision || !hasRationale || !hasFindings) {
    throw new Error("Reviewer returned malformed critique evidence.");
  }

  const findings = candidate.findings.map(createFinding);
  const hasBlockingFinding = findings.some((finding) => finding.severity === "blocking");
  if (candidate.decision === "accepted" && hasBlockingFinding) {
    throw new Error("An accepted critique cannot contain blocking findings.");
  }

  return Object.freeze({
    decision: candidate.decision,
    rationale: candidate.rationale.trim(),
    findings: Object.freeze(findings),
  });
}

/**
 * Validates one structured critique finding.
 *
 * @param {unknown} candidate Finding candidate.
 * @returns {object} Immutable finding.
 * @throws {Error} When severity or message is invalid.
 */
function createFinding(candidate) {
  const hasSeverity = ALLOWED_SEVERITIES.includes(candidate?.severity);
  const hasMessage = typeof candidate?.message === "string" && candidate.message.trim() !== "";
  if (!hasSeverity || !hasMessage) {
    throw new Error("Reviewer returned a malformed critique finding.");
  }
  return Object.freeze({ severity: candidate.severity, message: candidate.message.trim() });
}
