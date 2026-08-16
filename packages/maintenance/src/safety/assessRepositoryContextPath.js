import { posix } from "node:path";

/**
 * Decides whether one repository-relative file or directory may enter planning context.
 *
 * @param {{ path: string, kind: "file" | "directory", policy: object }} input Candidate and context policy.
 * @returns {{ status: string, reasons: string[] }} Immutable path decision.
 */
export function assessRepositoryContextPath(input) {
  const reasons = [];
  const normalized = normalizePath(input?.path);
  const segments = normalized?.split("/").map((segment) => segment.toLocaleLowerCase("en-US")) ?? [];
  const basename = segments.at(-1) ?? "";
  addReason(reasons, normalized === null, "invalid-path");
  addReason(reasons, hasForbiddenSegment(segments, input?.policy), "forbidden-segment");
  addReason(reasons, hasForbiddenFile(basename, input), "forbidden-file");
  addReason(reasons, !hasAllowedExtension(basename, input), "unsupported-file-type");
  return Object.freeze({ status: reasons.length === 0 ? "allowed" : "blocked",
    reasons: Object.freeze(reasons) });
}

/** Normalizes a repository-relative POSIX path or rejects escape attempts. */
function normalizePath(candidate) {
  if (typeof candidate !== "string" || candidate.trim() === "") return null;
  const normalized = posix.normalize(candidate.replaceAll("\\", "/"));
  const hasTraversal = normalized === ".." || normalized.startsWith("../");
  const hasAbsolute = normalized.startsWith("/") || /^[a-z]:\//iu.test(normalized);
  return normalized === "." || hasTraversal || hasAbsolute ? null : normalized;
}

/** Checks whether any path segment belongs to an excluded repository area. */
function hasForbiddenSegment(segments, policy) {
  return !Array.isArray(policy?.forbiddenSegments)
    || segments.some((segment) => policy.forbiddenSegments.includes(segment));
}

/** Checks secret and generated basenames for file candidates. */
function hasForbiddenFile(basename, input) {
  if (input?.kind !== "file") return false;
  const policy = input?.policy;
  const comparisonName = basename.toLocaleLowerCase("en-US");
  return !Array.isArray(policy?.forbiddenBasenames)
    || !Array.isArray(policy?.forbiddenExtensions)
    || policy.forbiddenBasenames.includes(comparisonName)
    || comparisonName.startsWith(".env.")
    || policy.forbiddenExtensions.some((extension) => comparisonName.endsWith(extension));
}

/** Checks the explicit text-file extension allow-list for files only. */
function hasAllowedExtension(basename, input) {
  if (input?.kind === "directory") return true;
  const comparisonName = basename.toLocaleLowerCase("en-US");
  return input?.kind === "file" && Array.isArray(input?.policy?.allowedExtensions)
    && input.policy.allowedExtensions.some((extension) => comparisonName.endsWith(extension));
}

/** Appends one stable decision reason when its predicate holds. */
function addReason(reasons, predicate, reason) {
  if (predicate) reasons.push(reason);
}
