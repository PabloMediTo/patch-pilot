import { createGitHubIssueRunSubmission } from "./createGitHubIssueRunSubmission.js";

const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;
const FULL_REVISION = /^[0-9a-f]{40}$/u;

/**
 * Routes authenticated GitHub envelopes to run submission or delivery reconciliation.
 *
 * @param {{ requestGitHub: Function, saveSubmittedRun: Function, reconcilePullRequestWebhook: Function }} input Provider and persistence ports.
 * @returns {Function} Authenticated webhook ingestion operation.
 */
export function createGitHubWebhookIngestion(input) {
  assertPorts(input);
  return async function ingestGitHubWebhook(envelope) {
    if (envelope?.eventName === "pull_request") {
      return input.reconcilePullRequestWebhook(envelope);
    }
    return createGitHubIssueRunSubmission({ ...envelope,
      resolveBaseRevision: (request) => resolveBaseRevision(input.requestGitHub, request),
      submitRun: input.saveSubmittedRun });
  };
}

/** Resolves one validated default branch to GitHub's immutable commit SHA. */
async function resolveBaseRevision(requestGitHub, request) {
  if (!REPOSITORY.test(request?.repository)) {
    throw invalidPayload("GitHub run request contains an invalid repository.");
  }
  const [owner, repository] = request.repository.split("/");
  const path = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`
    + `/git/ref/heads/${encodeURIComponent(request.defaultBranch)}`;
  const response = await requestGitHub({ installationId: request.installationId,
    method: "GET", path });
  const revision = response?.body?.object?.sha;
  if (response?.statusCode !== 200 || !FULL_REVISION.test(revision)) {
    throw new Error("GitHub default branch did not resolve to an immutable revision.");
  }
  return revision;
}

/** Requires concrete provider, persistence, and reconciliation ports. */
function assertPorts(input) {
  if ([input?.requestGitHub, input?.saveSubmittedRun, input?.reconcilePullRequestWebhook]
    .some((port) => typeof port !== "function")) {
    throw new Error("GitHub webhook ingestion requires provider, run store, and reconciliation ports.");
  }
}

/** Marks authenticated malformed input for stable HTTP mapping. */
function invalidPayload(message) {
  const error = new Error(message);
  error.code = "invalid-github-webhook";
  return error;
}
