import { assessExecutionSafety } from "./assessExecutionSafety.js";
import { createMvpSafetyPolicy } from "./createMvpSafetyPolicy.js";

/**
 * Sends an allowed command and mandatory limits to an isolated sandbox port.
 *
 * @param {{ request: object, runInSandbox: Function }} input Command and sandbox port.
 * @returns {Promise<object>} Sandbox execution evidence or blocked outcome.
 */
export async function executeWithMvpSafety(input) {
  const policy = createMvpSafetyPolicy();
  const decision = assessExecutionSafety({ request: input.request, policy });

  if (decision.status === "blocked") {
    return decision;
  }

  return input.runInSandbox(Object.freeze({
    cwd: input.request.cwd,
    executable: input.request.executable,
    args: Object.freeze([...input.request.args]),
    workspaceDirectory: input.request.workspaceDirectory,
    filesystemAccess: "workspace-only",
    limits: policy.execution,
  }));
}
