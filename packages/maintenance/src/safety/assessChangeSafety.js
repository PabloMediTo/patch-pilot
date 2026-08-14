import { posix } from "node:path";

/**
 * Checks a proposed diff summary against MVP size and sensitive-path limits.
 *
 * @param {{ changes: object[], policy: object }} input Proposed file changes and policy.
 * @returns {{ status: string, reasons: string[] }} Safety decision.
 */
export function assessChangeSafety({ changes, policy }) {
  const reasons = [];
  const uniquePaths = new Set(changes.map((change) => change.path));
  const changedLines = changes.reduce(
    (total, change) => total + change.addedLines + change.deletedLines,
    0,
  );
  const hasInvalidMetrics = changes.some(hasInvalidChangeMetrics);
  const hasForbiddenPath = changes.some(
    (change) => isForbiddenPath(change.path, policy.changes),
  );

  addReason(reasons, uniquePaths.size > policy.changes.maxFiles, "too-many-files");
  addReason(reasons, changedLines > policy.changes.maxChangedLines, "too-many-lines");
  addReason(reasons, hasInvalidMetrics, "invalid-change-metrics");
  addReason(reasons, hasForbiddenPath, "forbidden-path");

  return Object.freeze({
    status: reasons.length === 0 ? "allowed" : "blocked",
    reasons: Object.freeze(reasons),
  });
}

/**
 * Adds a reason only when its predicate is true.
 *
 * @param {string[]} reasons Mutable local reason list.
 * @param {boolean} predicate Whether the reason applies.
 * @param {string} reason Stable reason code.
 * @returns {void}
 */
function addReason(reasons, predicate, reason) {
  if (predicate) {
    reasons.push(reason);
  }
}

/**
 * Checks numeric change evidence.
 *
 * @param {object} change Proposed file change.
 * @returns {boolean} Whether metrics or the path are malformed.
 */
function hasInvalidChangeMetrics(change) {
  return typeof change.path !== "string"
    || !Number.isInteger(change.addedLines)
    || change.addedLines < 0
    || !Number.isInteger(change.deletedLines)
    || change.deletedLines < 0;
}

/**
 * Checks whether a repository-relative path touches an excluded MVP area.
 *
 * @param {unknown} candidatePath Proposed path.
 * @param {object} policy Change policy.
 * @returns {boolean} Whether the path is invalid or forbidden.
 */
function isForbiddenPath(candidatePath, policy) {
  if (typeof candidatePath !== "string" || candidatePath.trim() === "") {
    return true;
  }

  const normalizedPath = candidatePath.replaceAll("\\", "/");
  const normalized = posix.normalize(normalizedPath);
  const segments = normalized.split("/");
  const basename = segments.at(-1);
  const hasTraversal = normalized === ".." || normalized.startsWith("../") || /^[a-z]:\//iu.test(normalized);
  const hasForbiddenBasename = policy.forbiddenBasenames.includes(basename)
    || basename.startsWith(".env.")
    || /^requirements(?:-.+)?\.txt$/u.test(basename);
  const hasForbiddenExtension = policy.forbiddenExtensions.some(
    (extension) => basename.endsWith(extension),
  );
  const hasForbiddenSegment = segments.some((segment) => policy.forbiddenSegments.includes(segment));

  return normalized === "." || hasTraversal || normalized.startsWith("/")
    || hasForbiddenBasename || hasForbiddenExtension || hasForbiddenSegment;
}
