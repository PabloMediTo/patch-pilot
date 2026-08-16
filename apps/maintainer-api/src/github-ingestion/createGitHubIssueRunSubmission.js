import { createMaintenanceRun } from "@patch-pilot/maintenance";

import { readGitHubIssueRunRequest } from "./readGitHubIssueRunRequest.js";

/**
 * Converts one authenticated, opted-in GitHub issue envelope into a submitted run.
 *
 * @param {{ eventName: string, deliveryId: string, payload: object, resolveBaseRevision: Function, submitRun: Function, dispatchRun: Function }} input Authenticated envelope and outbound ports.
 * @returns {Promise<{ status: string, reason?: string, run?: object }>} Ingestion outcome.
 * @throws {Error} When a triggering payload or persistence result is invalid.
 */
export async function createGitHubIssueRunSubmission(input) {
  if (input.eventName !== "issues") {
    return Object.freeze({ status: "ignored", reason: "unsupported-event" });
  }

  const request = readGitHubIssueRunRequest(input.payload);

  if (request === null) {
    return Object.freeze({ status: "ignored", reason: "run-not-requested" });
  }

  const baseRevision = await input.resolveBaseRevision(request);
  const run = createRunFromDelivery(input.deliveryId, request, baseRevision);
  const submission = normalizeSubmission(await input.submitRun(run), run);
  if (submission.status === "conflict") return submission;
  const workflow = await input.dispatchRun(submission.run);
  return Object.freeze({ ...submission, workflow });
}

/**
 * Creates a run that retains its GitHub authorization and idempotency context.
 *
 * @param {string} deliveryId GitHub delivery identifier.
 * @param {{ installationId: number, repository: string, issueNumber: number, expectedFailure: string, actorId: number }} request Validated request.
 * @param {string} baseRevision Immutable revision resolved from GitHub.
 * @returns {object} Initial maintenance run.
 */
function createRunFromDelivery(deliveryId, request, baseRevision) {
  assertNonEmptyString(deliveryId, "deliveryId");
  assertNonEmptyString(baseRevision, "baseRevision");

  return createMaintenanceRun({
    id: `github:${deliveryId}`,
    installationId: request.installationId,
    repository: request.repository,
    issueNumber: request.issueNumber,
    expectedFailure: request.expectedFailure,
    defaultBranch: request.defaultBranch,
    baseRevision,
    actorId: request.actorId,
    sourceDeliveryId: deliveryId,
  });
}

/**
 * Rejects an empty ingestion value before a run is submitted.
 *
 * @param {unknown} value Candidate value.
 * @param {string} field Field name for error reporting.
 * @returns {void}
 * @throws {Error} When the value is not a non-empty string.
 */
function assertNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    const error = new Error(`GitHub ingestion field ${field} must be a non-empty string.`);
    error.code = "invalid-github-webhook";
    throw error;
  }
}

/** Maps canonical store outcomes to stable webhook ingestion outcomes. */
function normalizeSubmission(result, run) {
  if (result?.status === "created") {
    return Object.freeze({ status: "accepted", run: result.run ?? run });
  }
  if (result?.status === "existing") {
    return Object.freeze({ status: "replayed", run: result.run });
  }
  if (result?.status === "conflict") {
    return Object.freeze({ status: "conflict", reason: "run-submission-conflict" });
  }
  throw new Error("GitHub run submission persistence returned an invalid outcome.");
}
