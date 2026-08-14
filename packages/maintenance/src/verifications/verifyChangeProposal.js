/**
 * Executes the supported project's standard command and records verification evidence.
 *
 * @param {{ proposal: object, project: object, executeCommand: Function }} input Ready proposal, supported project, and isolated executor port.
 * @returns {Promise<object>} Immutable verification result and command evidence.
 * @throws {Error} When prerequisites or executor evidence are malformed.
 */
export async function verifyChangeProposal(input) {
  assertVerificationInput(input);
  const execution = await input.executeCommand(Object.freeze({
    cwd: input.project.workspaceDirectory,
    executable: input.project.command.executable,
    args: Object.freeze([...input.project.command.args]),
  }));
  assertExecutionEvidence(execution);

  const evidence = Object.freeze({
    command: Object.freeze({
      executable: input.project.command.executable,
      args: Object.freeze([...input.project.command.args]),
    }),
    exitCode: execution.exitCode,
    stdout: execution.stdout,
    stderr: execution.stderr,
    durationMs: execution.durationMs,
    hasTimedOut: execution.hasTimedOut,
    hasTruncatedOutput: execution.hasTruncatedOutput,
  });

  return createVerificationResult(evidence);
}

/**
 * Validates proposal, project, and executor prerequisites.
 *
 * @param {object} input Verification input.
 * @returns {void}
 * @throws {Error} When verification cannot safely start.
 */
function assertVerificationInput(input) {
  const hasCommand = typeof input?.project?.command?.executable === "string"
    && Array.isArray(input?.project?.command?.args);
  const hasWorkspace = typeof input?.project?.workspaceDirectory === "string"
    && input.project.workspaceDirectory.trim() !== "";
  if (input?.proposal?.status !== "ready" || !hasCommand || !hasWorkspace
    || typeof input?.executeCommand !== "function") {
    throw new Error("Verification requires a ready proposal, supported project, and executor port.");
  }
}

/**
 * Validates bounded command evidence.
 *
 * @param {unknown} execution Candidate evidence.
 * @returns {void}
 * @throws {Error} When required evidence is absent or invalid.
 */
function assertExecutionEvidence(execution) {
  const hasExitCode = Number.isInteger(execution?.exitCode);
  const hasOutput = typeof execution?.stdout === "string" && typeof execution?.stderr === "string";
  const hasDuration = Number.isFinite(execution?.durationMs) && execution.durationMs >= 0;
  const hasFlags = typeof execution?.hasTimedOut === "boolean"
    && typeof execution?.hasTruncatedOutput === "boolean";
  if (!hasExitCode || !hasOutput || !hasDuration || !hasFlags) {
    throw new Error("Executor returned invalid verification evidence.");
  }
}

/**
 * Classifies one bounded command result.
 *
 * @param {object} evidence Validated command evidence.
 * @returns {object} Passed, failed, or execution-failed result.
 */
function createVerificationResult(evidence) {
  if (evidence.hasTimedOut) {
    return Object.freeze({ status: "execution-failed", reason: "timeout", evidence });
  }
  if (evidence.hasTruncatedOutput) {
    return Object.freeze({ status: "execution-failed", reason: "output-truncated", evidence });
  }
  return Object.freeze({ status: evidence.exitCode === 0 ? "passed" : "failed", evidence });
}
