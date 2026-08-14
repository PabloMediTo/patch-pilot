/**
 * Creates an immutable review model from persisted run evidence.
 *
 * @param {{ run: object, timeline: object[], proposal: object, verification: object, approval?: object }} input Review evidence.
 * @returns {object} Immutable review model.
 */
export function createRunReview(input) {
  assertReviewInput(input);
  const canDecide = input.run.status === "awaiting-approval" && input.approval === undefined;
  return Object.freeze({
    run: Object.freeze({ id: input.run.id, status: input.run.status }),
    timeline: Object.freeze(input.timeline.map(createTimelineItem)),
    diff: Object.freeze(createDiffLines(input.proposal.diff)),
    plan: Object.freeze(input.proposal.plan.steps.map((step) => Object.freeze({ ...step }))),
    verification: createVerificationSummary(input.verification),
    decision: input.approval === undefined ? null : Object.freeze({ ...input.approval }),
    actions: Object.freeze({
      approve: canDecide ? `/runs/${input.run.id}/approval/approve` : null,
      reject: canDecide ? `/runs/${input.run.id}/approval/reject` : null,
    }),
  });
}

/** Validates complete persisted review evidence. */
function assertReviewInput(input) {
  const hasRun = typeof input?.run?.id === "string" && typeof input?.run?.status === "string";
  const hasTimeline = Array.isArray(input?.timeline);
  const hasProposal = typeof input?.proposal?.diff === "string" && Array.isArray(input?.proposal?.plan?.steps);
  const hasVerification = ["passed", "failed", "execution-failed"].includes(input?.verification?.status)
    && typeof input?.verification?.evidence?.stdout === "string"
    && typeof input?.verification?.evidence?.stderr === "string";
  if (!hasRun || !hasTimeline || !hasProposal || !hasVerification) {
    throw new Error("Run review requires run, timeline, proposal, and verification evidence.");
  }
}

/** Copies one ordered timeline event into the public review shape. */
function createTimelineItem(event) {
  return Object.freeze({ sequence: event.sequence, type: event.type, occurredAt: event.occurredAt });
}

/** Classifies unified-diff lines for accessible presentation. */
function createDiffLines(diff) {
  return diff.split("\n").map((text, index) => Object.freeze({
    number: index + 1,
    kind: text.startsWith("+") && !text.startsWith("+++")
      ? "addition"
      : text.startsWith("-") && !text.startsWith("---") ? "deletion" : "context",
    text,
  }));
}

/** Extracts the evidence fields required for human approval. */
function createVerificationSummary(verification) {
  const evidence = verification.evidence;
  return Object.freeze({
    status: verification.status,
    command: Object.freeze({ ...evidence.command, args: Object.freeze([...evidence.command.args]) }),
    exitCode: evidence.exitCode,
    stdout: evidence.stdout,
    stderr: evidence.stderr,
    durationMs: evidence.durationMs,
    hasTimedOut: evidence.hasTimedOut,
    hasTruncatedOutput: evidence.hasTruncatedOutput,
  });
}
