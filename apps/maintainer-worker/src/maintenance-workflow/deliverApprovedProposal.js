/**
 * Delivers one exactly approved final attempt and records bounded lifecycle evidence.
 *
 * @param {{ run: object, attemptResult: object, review: object, approval: object, deliverApprovedPullRequest: Function, recordEvent: Function }} input Approved evidence and workflow ports.
 * @returns {Promise<object>} Created, replayed, blocked, or conflicting delivery outcome.
 */
export async function deliverApprovedProposal(input) {
  const request = createDeliveryRequest(input.run, input.attemptResult, input.review);
  await input.recordEvent("delivery-started", { planVersion: request.proposal.planVersion,
    approvedAt: input.approval.decidedAt });
  try {
    const outcome = await input.deliverApprovedPullRequest(request);
    assertDeliveryOutcome(outcome, input.run);
    await input.recordEvent(`delivery-${["created", "replayed"].includes(outcome.status)
      ? "completed" : outcome.status}`, summarizeDeliveryOutcome(outcome));
    return outcome;
  } catch (error) {
    await input.recordEvent("delivery-failed", { message: safeMessage(error) });
    throw error;
  }
}

/** Builds bounded deterministic pull-request content from the reviewed final attempt. */
function createDeliveryRequest(run, attemptResult, review) {
  const finalAttempt = attemptResult.attempts.at(-1);
  return Object.freeze({ runId: run.id, installationId: run.installationId,
    repository: run.repository, issueNumber: run.issueNumber, baseBranch: run.defaultBranch,
    proposal: Object.freeze({ baseRevision: review.reviewBinding.baseRevision,
      planVersion: review.reviewBinding.planVersion,
      sourceDiff: finalAttempt.proposal.sourceDiff.unifiedDiff,
      title: `Fix #${run.issueNumber}: ${run.issueTitle}`.slice(0, 256),
      body: finalAttempt.proposal.plan.summary,
      verification: review.reviewBinding.verification }) });
}

/** Accepts only known delivery classifications and exact provider evidence. */
function assertDeliveryOutcome(outcome, run) {
  if (["blocked", "conflict"].includes(outcome?.status)) {
    if (typeof outcome.reason === "string" && outcome.reason.trim() !== "") return;
  } else if (["created", "replayed"].includes(outcome?.status)) {
    const delivery = outcome.delivery;
    const hasIdentity = delivery?.runId === run.id && delivery.repository === run.repository
      && /^[0-9a-f]{40}$/u.test(delivery.headRevision)
      && typeof delivery.branchName === "string" && delivery.branchName.trim() !== ""
      && Number.isInteger(delivery.pullRequest?.number) && delivery.pullRequest.number > 0
      && delivery.pullRequest.draft === true;
    if (hasIdentity) return;
  }
  throw new Error("GitHub delivery Activity returned an invalid outcome.");
}

/** Removes source and approval secrets while retaining provider delivery evidence. */
function summarizeDeliveryOutcome(outcome) {
  if (!["created", "replayed"].includes(outcome.status)) {
    return Object.freeze({ status: outcome.status, reason: outcome.reason });
  }
  return Object.freeze({ status: outcome.status, branchName: outcome.delivery.branchName,
    headRevision: outcome.delivery.headRevision,
    pullRequest: outcome.delivery.pullRequest,
    deliveredAt: outcome.delivery.deliveredAt });
}

/** Converts an Activity failure to bounded timeline evidence. */
function safeMessage(error) {
  return error instanceof Error && error.message.trim() !== "" ? error.message.slice(0, 500)
    : "GitHub delivery Activity failed.";
}
