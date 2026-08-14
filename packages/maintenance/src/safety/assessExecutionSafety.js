import { resolve, sep } from "node:path";

/**
 * Checks whether one command request fits the exact MVP execution policy.
 *
 * @param {{ request: object, policy: object }} input Command request and policy.
 * @returns {{ status: string, reasons: string[] }} Safety decision.
 */
export function assessExecutionSafety({ request, policy }) {
  const reasons = [];
  const hasAllowedCommand = policy.execution.allowedCommands.some(
    (allowed) => allowed.executable === request.executable
      && hasEqualArrayValues(allowed.args, request.args),
  );
  const hasWorkspaceCwd = isInsideWorkspace(request.workspaceDirectory, request.cwd);

  if (!hasAllowedCommand) {
    reasons.push("command-not-allowed");
  }
  if (!hasWorkspaceCwd) {
    reasons.push("cwd-outside-workspace");
  }

  return Object.freeze({
    status: reasons.length === 0 ? "allowed" : "blocked",
    reasons: Object.freeze(reasons),
  });
}

/**
 * Checks exact ordered argument equality.
 *
 * @param {unknown} left First candidate.
 * @param {unknown} right Second candidate.
 * @returns {boolean} Whether both arrays contain the same strings in order.
 */
function hasEqualArrayValues(left, right) {
  return Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && left.every((value, index) => value === right[index]);
}

/**
 * Checks that a command directory is the workspace or one of its descendants.
 *
 * @param {unknown} workspaceDirectory Declared workspace root.
 * @param {unknown} cwd Candidate command directory.
 * @returns {boolean} Whether the path is contained by the workspace.
 */
function isInsideWorkspace(workspaceDirectory, cwd) {
  if (typeof workspaceDirectory !== "string" || typeof cwd !== "string") {
    return false;
  }

  const workspace = resolve(workspaceDirectory);
  const commandDirectory = resolve(cwd);
  return commandDirectory === workspace || commandDirectory.startsWith(`${workspace}${sep}`);
}
