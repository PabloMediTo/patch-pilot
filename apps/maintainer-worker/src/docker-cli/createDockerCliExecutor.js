import { execFile } from "node:child_process";

/**
 * Creates the worker-owned bounded Docker CLI execution port.
 *
 * @param {{ execFileProcess?: Function, now?: Function }} dependencies Process and clock dependencies.
 * @returns {Function} Docker command executor returning bounded evidence.
 */
export function createDockerCliExecutor(dependencies = {}) {
  const execFileProcess = dependencies.execFileProcess ?? execFile;
  const now = dependencies.now ?? Date.now;

  return (request) => executeDockerCommand({ execFileProcess, now, request });
}

/**
 * Executes one exact Docker argument vector without a shell.
 *
 * @param {{ execFileProcess: Function, now: Function, request: object }} input Execution dependencies and request.
 * @returns {Promise<object>} Bounded process evidence.
 */
function executeDockerCommand(input) {
  assertDockerRequest(input.request);
  const startedAt = input.now();

  return new Promise((resolve) => {
    input.execFileProcess("docker", input.request.args, {
      encoding: "utf8",
      maxBuffer: input.request.maxOutputBytes,
      timeout: input.request.timeoutMs,
      windowsHide: true,
    }, (error, stdout = "", stderr = "") => resolve(createEvidence({
      error, stdout, stderr, durationMs: input.now() - startedAt,
    })));
  });
}

/** Validates the fixed bounded-process request shape. */
function assertDockerRequest(request) {
  const hasArgs = Array.isArray(request?.args) && request.args.every((value) => typeof value === "string");
  const hasTimeout = Number.isInteger(request?.timeoutMs) && request.timeoutMs > 0;
  const hasOutputLimit = Number.isInteger(request?.maxOutputBytes) && request.maxOutputBytes > 0;
  if (!hasArgs || !hasTimeout || !hasOutputLimit) {
    throw new Error("Docker CLI execution requires arguments, timeout, and output limit.");
  }
}

/** Converts Node process completion into the maintenance evidence contract. */
function createEvidence(input) {
  const hasTruncatedOutput = input.error?.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";
  const hasTimedOut = input.error?.killed === true && !hasTruncatedOutput;
  const exitCode = Number.isInteger(input.error?.code) ? input.error.code : input.error ? -1 : 0;
  return Object.freeze({
    exitCode,
    stdout: input.stdout,
    stderr: input.stderr,
    durationMs: input.durationMs,
    hasTimedOut,
    hasTruncatedOutput,
  });
}
