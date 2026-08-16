/**
 * Orchestrates durable inspection and reproduction through explicit Activity ports.
 *
 * @param {{ run: object, recordTimelineEvent: Function, inspectRepository: Function, reproduceIssue: Function, collectPlanningContext: Function, now: Function }} input Persisted run and deterministic workflow ports.
 * @returns {Promise<object>} Planning-context or terminal workflow outcome.
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
  return Object.freeze({ status: "planning-ready", runId: input.run.id,
    inspection, reproduction, repositoryContext });
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
    && typeof run.repository === "string" && run.repository.trim() !== ""
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

/** Converts an Activity failure to bounded timeline evidence. */
function safeMessage(error) {
  return error instanceof Error && error.message.trim() !== "" ? error.message.slice(0, 500)
    : "Maintenance workflow Activity failed.";
}
