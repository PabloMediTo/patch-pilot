/**
 * Orchestrates durable inspection and reproduction through explicit Activity ports.
 *
 * @param {{ run: object, recordTimelineEvent: Function, inspectRepository: Function, reproduceIssue: Function, now: Function }} input Persisted run and deterministic workflow ports.
 * @returns {Promise<object>} Reproduction-phase workflow outcome.
 */
export async function orchestrateMaintenanceRun(input) {
  assertPersistedRun(input?.run);
  await input.recordTimelineEvent(createEvent({ run: input.run, step: "submitted",
    occurredAt: input.run.submittedAt, payload: { status: "submitted" } }));
  const inspection = await runInspectionPhase(input);
  if (inspection.status !== "supported") {
    await recordEvent(input, "reproduction-skipped", { reason: inspection.reason });
    return Object.freeze({ status: "unsupported", runId: input.run.id, inspection });
  }
  const reproduction = await runReproductionPhase(input);
  return Object.freeze({ status: "reproduction-completed", runId: input.run.id,
    inspection, reproduction });
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
    await recordEvent(input, "reproduction-completed", { reproduction });
    return reproduction;
  } catch (error) {
    await recordEvent(input, "reproduction-failed", { message: safeMessage(error) });
    throw error;
  }
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
    && typeof run.repository === "string" && run.repository.trim() !== ""
    && typeof run.baseRevision === "string" && /^[0-9a-f]{40}$/u.test(run.baseRevision)
    && typeof run.expectedFailure === "string" && run.expectedFailure.trim() !== ""
    && run.expectedFailure.length <= 500;
  if (!hasIdentity || run.status !== "submitted" || Number(run.issueNumber) < 1
    || Number.isNaN(Date.parse(run.submittedAt))) {
    throw new Error("Maintenance workflow requires one persisted submitted run.");
  }
}

/** Converts an Activity failure to bounded timeline evidence. */
function safeMessage(error) {
  return error instanceof Error && error.message.trim() !== "" ? error.message.slice(0, 500)
    : "Repository inspection failed.";
}
