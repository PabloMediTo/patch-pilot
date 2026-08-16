/**
 * Reads an opted-in issue event into the identifiers needed to submit a run.
 *
 * @param {Record<string, unknown>} payload Parsed GitHub webhook payload.
 * @returns {{ installationId: number, repository: string, issueNumber: number, issueTitle: string, issueContext: string, expectedFailure: string, defaultBranch: string, actorId: number } | null} Run request or null for a non-triggering event.
 * @throws {Error} When a triggering event omits a required identifier.
 */
export function readGitHubIssueRunRequest(payload) {
  const isRunRequested =
    payload.action === "labeled" && payload.label?.name === "patch-pilot";

  if (!isRunRequested) {
    return null;
  }

  const issue = readIssueEvidence(payload.issue?.title, payload.issue?.body);
  return Object.freeze({
    installationId: readPositiveInteger(payload.installation?.id, "installation.id"),
    repository: readNonEmptyString(payload.repository?.full_name, "repository.full_name"),
    issueNumber: readPositiveInteger(payload.issue?.number, "issue.number"),
    ...issue,
    defaultBranch: readNonEmptyString(payload.repository?.default_branch, "repository.default_branch"),
    actorId: readPositiveInteger(payload.sender?.id, "sender.id"),
  });
}

/** Extracts bounded planning and failure evidence from the issue. */
function readIssueEvidence(title, body) {
  const issueTitle = readBoundedString(title, "issue.title", 500);
  const source = readNonEmptyString(body, "issue.body");
  const openingMarker = "<!-- patch-pilot:expected-failure -->";
  const closingMarker = "<!-- /patch-pilot:expected-failure -->";
  const matches = [...source.matchAll(/<!-- patch-pilot:expected-failure -->\s*([\s\S]*?)\s*<!-- \/patch-pilot:expected-failure -->/gu)];
  const hasOneMarkerPair = source.split(openingMarker).length === 2
    && source.split(closingMarker).length === 2 && matches.length === 1;
  const expectedFailure = hasOneMarkerPair ? matches[0][1].trim() : undefined;
  if (expectedFailure === undefined || expectedFailure === "" || expectedFailure.length > 500) {
    throw invalidPayload("GitHub issue body requires one bounded patch-pilot expected-failure marker.");
  }
  const issueContext = source.replace(matches[0][0], "").trim();
  if (issueContext === "" || issueContext.length > 8000) {
    throw invalidPayload("GitHub issue body requires bounded descriptive context outside the expected-failure marker.");
  }
  return Object.freeze({ issueTitle, issueContext, expectedFailure });
}

/** Reads one trimmed non-empty string within a product-owned bound. */
function readBoundedString(value, field, maximumLength) {
  const result = readNonEmptyString(value, field).trim();
  if (result.length > maximumLength) {
    throw invalidPayload(`GitHub payload field ${field} exceeds its maximum length.`);
  }
  return result;
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
