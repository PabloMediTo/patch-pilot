/**
 * Orchestrates the first durable inspection phase through explicit Activity ports.
 *
 * @param {{ run: object, recordTimelineEvent: Function, inspectRepository: Function, now: Function }} input Persisted run and deterministic workflow ports.
 * @returns {Promise<object>} First-phase workflow outcome.
 */
export async function orchestrateMaintenanceRun(input) {
  assertPersistedRun(input?.run);
  await input.recordTimelineEvent(createEvent({ run: input.run, step: "submitted",
    occurredAt: input.run.submittedAt, payload: { status: "submitted" } }));
  await input.recordTimelineEvent(createEvent({ run: input.run, step: "inspection-started",
    occurredAt: input.now(), payload: createTarget(input.run) }));
  try {
    const inspection = await input.inspectRepository(input.run);
    await input.recordTimelineEvent(createEvent({ run: input.run, step: "inspection-completed",
      occurredAt: input.now(), payload: { inspection } }));
    return Object.freeze({ status: "inspection-completed", runId: input.run.id, inspection });
  } catch (error) {
    await input.recordTimelineEvent(createEvent({ run: input.run, step: "inspection-failed",
      occurredAt: input.now(), payload: { message: safeMessage(error) } }));
    throw error;
  }
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
    && typeof run.baseRevision === "string" && /^[0-9a-f]{40}$/u.test(run.baseRevision);
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
