import { execFile } from "node:child_process";
import { promisify } from "node:util";

const executeFile = promisify(execFile);
const COMMAND_TIMEOUT_MS = 10_000;
const MAX_OUTPUT_BYTES = 65_536;

/**
 * Runs one bounded Docker readiness probe without shell interpretation.
 *
 * @param {string} executable Exact executable name.
 * @param {string[]} args Exact Docker argument vector.
 * @param {{ cwd: string }} options Controlled project directory.
 * @param {Function} [execute] Injected process port for focused tests.
 * @returns {Promise<object>} Process completion evidence.
 */
export function runPilotReadinessCommand(executable, args, options, execute = executeFile) {
  if (executable !== "docker" || !Array.isArray(args)
    || args.some((argument) => typeof argument !== "string")
    || typeof options?.cwd !== "string" || options.cwd.trim() === ""
    || typeof execute !== "function") {
    throw new Error("Pilot readiness command requires an exact Docker argument vector.");
  }
  return execute(executable, args, Object.freeze({
    cwd: options.cwd,
    windowsHide: true,
    shell: false,
    timeout: COMMAND_TIMEOUT_MS,
    maxBuffer: MAX_OUTPUT_BYTES,
    killSignal: "SIGKILL",
  }));
}
