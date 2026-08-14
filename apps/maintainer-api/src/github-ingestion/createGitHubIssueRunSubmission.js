import { createMaintenanceRun } from "@patch-pilot/maintenance";

import { readGitHubIssueRunRequest } from "./readGitHubIssueRunRequest.js";
import { hasValidGitHubWebhookSignature } from "./hasValidGitHubWebhookSignature.js";

/**
 * Converts one signed, opted-in GitHub issue webhook into a submitted run.
 *
 * @param {{ eventName: string, deliveryId: string, rawBody: string, signature: string, secret: string, resolveBaseRevision: Function, submitRun: Function }} input Delivery data and outbound ports.
 * @returns {Promise<{ status: string, reason?: string, run?: object }>} Ingestion outcome.
 * @throws {Error} When authentication or a triggering payload is invalid.
 */
export async function createGitHubIssueRunSubmission(input) {
  assertValidSignature(input);

  if (input.eventName !== "issues") {
    return Object.freeze({ status: "ignored", reason: "unsupported-event" });
  }

  const payload = JSON.parse(input.rawBody);
  const request = readGitHubIssueRunRequest(payload);

  if (request === null) {
    return Object.freeze({ status: "ignored", reason: "run-not-requested" });
  }

  const baseRevision = await input.resolveBaseRevision(request);
  const run = createRunFromDelivery(input.deliveryId, request, baseRevision);
  await input.submitRun(run);

  return Object.freeze({ status: "accepted", run });
}

/**
 * Rejects a delivery whose raw body does not match its signature.
 *
 * @param {{ rawBody: string, secret: string, signature: string }} input Delivery signature material.
 * @returns {void}
 * @throws {Error} When signature verification fails.
 */
function assertValidSignature(input) {
  const hasValidSignature = hasValidGitHubWebhookSignature(input);

  if (!hasValidSignature) {
    throw new Error("Invalid GitHub webhook signature.");
  }
}

/**
 * Creates a run that retains its GitHub authorization and idempotency context.
 *
 * @param {string} deliveryId GitHub delivery identifier.
 * @param {{ installationId: number, repository: string, issueNumber: number, actorId: number }} request Validated request.
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
    throw new Error(`GitHub ingestion field ${field} must be a non-empty string.`);
  }
}
