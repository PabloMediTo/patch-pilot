/**
 * Reads an opted-in issue event into the identifiers needed to submit a run.
 *
 * @param {Record<string, unknown>} payload Parsed GitHub webhook payload.
 * @returns {{ installationId: number, repository: string, issueNumber: number, defaultBranch: string, actorId: number } | null} Run request or null for a non-triggering event.
 * @throws {Error} When a triggering event omits a required identifier.
 */
export function readGitHubIssueRunRequest(payload) {
  const isRunRequested =
    payload.action === "labeled" && payload.label?.name === "patch-pilot";

  if (!isRunRequested) {
    return null;
  }

  return Object.freeze({
    installationId: readPositiveInteger(payload.installation?.id, "installation.id"),
    repository: readNonEmptyString(payload.repository?.full_name, "repository.full_name"),
    issueNumber: readPositiveInteger(payload.issue?.number, "issue.number"),
    defaultBranch: readNonEmptyString(payload.repository?.default_branch, "repository.default_branch"),
    actorId: readPositiveInteger(payload.sender?.id, "sender.id"),
  });
}

/**
 * Reads one required positive integer.
 *
 * @param {unknown} value Candidate value.
 * @param {string} field Field name for error reporting.
 * @returns {number} Validated integer.
 * @throws {Error} When the value is not a positive integer.
 */
function readPositiveInteger(value, field) {
  if (!Number.isInteger(value) || value <= 0) {
    throw invalidPayload(`GitHub payload field ${field} must be a positive integer.`);
  }

  return value;
}

/**
 * Reads one required non-empty string.
 *
 * @param {unknown} value Candidate value.
 * @param {string} field Field name for error reporting.
 * @returns {string} Validated string.
 * @throws {Error} When the value is not a non-empty string.
 */
function readNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw invalidPayload(`GitHub payload field ${field} must be a non-empty string.`);
  }

  return value;
}

/** Marks authenticated malformed webhook evidence for stable transport mapping. */
function invalidPayload(message) {
  const error = new Error(message);
  error.code = "invalid-github-webhook";
  return error;
}
