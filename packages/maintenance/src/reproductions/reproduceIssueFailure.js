/**
 * Executes a supported project's standard test command and matches the reported failure.
 *
 * @param {{ project: object, expectedFailure: string, executeCommand: Function }} input Project, issue evidence, and bounded executor port.
 * @returns {Promise<object>} Reproduction outcome with command evidence.
 * @throws {Error} When expected failure evidence is empty or executor evidence is malformed.
 */
export async function reproduceIssueFailure(input) {
  assertExpectedFailure(input.expectedFailure);

  if (input.project.status !== "supported") {
    return Object.freeze({ status: "unsupported", reason: input.project.reason });
  }

  const execution = await input.executeCommand({
    cwd: input.project.workspaceDirectory,
    ...input.project.command,
  });
  assertExecutionEvidence(execution);

  const evidence = createEvidence(input.project.command, execution);
  return createReproductionOutcome(evidence, input.expectedFailure);
}

/**
 * Creates immutable command evidence for review and persistence.
 *
 * @param {{ executable: string, args: string[] }} command Executed command.
 * @param {object} execution Bounded executor result.
 * @returns {object} Immutable reproduction evidence.
 */
function createEvidence(command, execution) {
  return Object.freeze({
    command: Object.freeze({ executable: command.executable, args: Object.freeze([...command.args]) }),
    exitCode: execution.exitCode,
    stdout: execution.stdout,
    stderr: execution.stderr,
    durationMs: execution.durationMs,
    hasTimedOut: execution.hasTimedOut,
    hasTruncatedOutput: execution.hasTruncatedOutput,
  });
}

/**
 * Classifies command evidence against the issue's expected failure text.
 *
 * @param {object} evidence Recorded execution evidence.
 * @param {string} expectedFailure Expected issue failure fragment.
 * @returns {object} Reproduced, non-reproduced, or different-failure outcome.
 */
function createReproductionOutcome(evidence, expectedFailure) {
  if (evidence.hasTimedOut) {
    return Object.freeze({ status: "execution-failed", reason: "timeout", evidence });
  }
  if (evidence.hasTruncatedOutput) {
    return Object.freeze({ status: "execution-failed", reason: "output-truncated", evidence });
  }
  if (evidence.exitCode === 0) {
    return Object.freeze({ status: "not-reproduced", evidence });
  }

  const combinedOutput = `${evidence.stdout}\n${evidence.stderr}`;
  const hasExpectedFailure = combinedOutput.includes(expectedFailure);
  return hasExpectedFailure
    ? Object.freeze({ status: "reproduced", evidence })
    : Object.freeze({ status: "different-failure", evidence });
}

/**
 * Validates issue-derived failure evidence.
 *
 * @param {unknown} expectedFailure Candidate failure fragment.
 * @returns {void}
 * @throws {Error} When no concrete failure fragment is supplied.
 */
function assertExpectedFailure(expectedFailure) {
  if (typeof expectedFailure !== "string" || expectedFailure.trim() === "") {
    throw new Error("Reproduction requires a non-empty expected failure fragment.");
  }
}

/**
 * Validates the minimum evidence contract of the bounded executor port.
 *
 * @param {object} execution Candidate execution evidence.
 * @returns {void}
 * @throws {Error} When required evidence fields are absent or invalid.
 */
function assertExecutionEvidence(execution) {
  const hasExitCode = Number.isInteger(execution?.exitCode);
  const hasOutput = typeof execution?.stdout === "string" && typeof execution?.stderr === "string";
  const hasDuration = Number.isFinite(execution?.durationMs) && execution.durationMs >= 0;
  const hasFlags = typeof execution?.hasTimedOut === "boolean"
    && typeof execution?.hasTruncatedOutput === "boolean";

  if (!hasExitCode || !hasOutput || !hasDuration || !hasFlags) {
    throw new Error("Bounded executor returned invalid reproduction evidence.");
  }
}
