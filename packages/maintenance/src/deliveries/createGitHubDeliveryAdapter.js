const FULL_REVISION = /^[0-9a-f]{40}$/u;
const BRANCH_NAME = /^patch-pilot\/[0-9a-f]{24}$/u;
const REPOSITORY = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/u;

/**
 * Creates GitHub REST operations for idempotent branch and draft-PR delivery.
 *
 * @param {{ requestGitHub: Function, publishCommit: Function }} ports Authenticated REST and commit-publication ports.
 * @returns {{ publishBranch: Function, ensureDraftPullRequest: Function }} Delivery provider operations.
 */
export function createGitHubDeliveryAdapter(ports) {
  assertPorts(ports);
  return Object.freeze({
    publishBranch: async (request) => publishBranch(ports, request),
    ensureDraftPullRequest: async (request) => ensureDraftPullRequest(ports.requestGitHub, request),
  });
}

/** Validates the two provider responsibilities composed by this adapter. */
function assertPorts(ports) {
  if (typeof ports?.requestGitHub !== "function" || typeof ports?.publishCommit !== "function") {
    throw new Error("GitHub delivery adapter requires REST and commit publication ports.");
  }
}

/** Publishes the commit first and then safely creates or replays its branch ref. */
async function publishBranch(ports, request) {
  assertBranchRequest(request);
  const commit = await ports.publishCommit(request);
  if (!FULL_REVISION.test(commit?.headRevision)) {
    throw new Error("Commit publisher must return a full GitHub head revision.");
  }
  const route = createRepositoryRoute(request.repository);
  const ref = await getBranchRef(ports.requestGitHub, request, route);
  if (ref.statusCode === 200) return replayBranchRef(ref.body, commit.headRevision);
  if (ref.statusCode !== 404) throw createGitHubError("read branch", ref.statusCode);
  return createBranchRef(ports.requestGitHub, { request, route, headRevision: commit.headRevision });
}

/** Validates deterministic branch publication input. */
function assertBranchRequest(request) {
  if (!Number.isInteger(request?.installationId) || request.installationId <= 0
    || !REPOSITORY.test(request?.repository) || !BRANCH_NAME.test(request?.branchName)
    || !FULL_REVISION.test(request?.baseRevision) || typeof request?.sourceDiff !== "string") {
    throw new Error("GitHub branch publication requires exact delivery intent.");
  }
}

/** Reads one deterministic branch reference. */
function getBranchRef(requestGitHub, request, route) {
  return requestGitHub(Object.freeze({ installationId: request.installationId, method: "GET",
    path: `${route}/git/ref/heads/${request.branchName}` }));
}

/** Accepts an existing branch only when it points to the published commit. */
function replayBranchRef(body, headRevision) {
  if (body?.object?.type !== "commit" || body.object.sha !== headRevision) {
    throw new Error("GitHub branch already points to a different commit.");
  }
  return Object.freeze({ headRevision });
}

/** Creates the branch and resolves a concurrent create through one safe reread. */
async function createBranchRef(requestGitHub, input) {
  const { request, route, headRevision } = input;
  const created = await requestGitHub(Object.freeze({ installationId: request.installationId,
    method: "POST", path: `${route}/git/refs`,
    body: Object.freeze({ ref: `refs/heads/${request.branchName}`, sha: headRevision }) }));
  if (created.statusCode === 201) return replayBranchRef(created.body, headRevision);
  if (created.statusCode !== 422) throw createGitHubError("create branch", created.statusCode);
  const raced = await getBranchRef(requestGitHub, request, route);
  if (raced.statusCode !== 200) throw createGitHubError("recover branch race", raced.statusCode);
  return replayBranchRef(raced.body, headRevision);
}

/** Creates or replays the one exact open draft pull request for the branch. */
async function ensureDraftPullRequest(requestGitHub, request) {
  assertPullRequest(request);
  const route = `${createRepositoryRoute(request.repository)}/pulls`;
  const existing = await listPullRequests(requestGitHub, request, route);
  if (existing.length > 0) return replayPullRequest(existing, request);
  const created = await requestGitHub(Object.freeze({ installationId: request.installationId,
    method: "POST", path: route, body: Object.freeze({ title: request.title,
      head: request.headBranch, base: request.baseBranch, body: request.body, draft: true }) }));
  if (created.statusCode === 201) return mapPullRequest(created.body, request);
  if (created.statusCode !== 422) throw createGitHubError("create pull request", created.statusCode);
  return replayPullRequest(await listPullRequests(requestGitHub, request, route), request);
}

/** Validates that the caller can request only the deterministic draft shape. */
function assertPullRequest(request) {
  const hasText = [request?.baseBranch, request?.title, request?.body]
    .every((value) => typeof value === "string" && value.trim() !== "");
  if (!Number.isInteger(request?.installationId) || request.installationId <= 0
    || !REPOSITORY.test(request?.repository) || !BRANCH_NAME.test(request?.headBranch)
    || request?.draft !== true || !hasText) {
    throw new Error("GitHub pull request delivery requires one exact draft intent.");
  }
}

/** Lists all pull requests for the exact head/base pair to prevent duplicates. */
async function listPullRequests(requestGitHub, request, route) {
  const owner = REPOSITORY.exec(request.repository)[1];
  const response = await requestGitHub(Object.freeze({ installationId: request.installationId,
    method: "GET", path: route, query: Object.freeze({ state: "all",
      head: `${owner}:${request.headBranch}`, base: request.baseBranch }) }));
  if (response.statusCode !== 200 || !Array.isArray(response.body)) {
    throw createGitHubError("list pull requests", response.statusCode);
  }
  return response.body;
}

/** Requires exactly one replay candidate after a list or create race. */
function replayPullRequest(candidates, request) {
  if (candidates.length !== 1) {
    throw new Error("GitHub pull request replay requires exactly one existing candidate.");
  }
  return mapPullRequest(candidates[0], request);
}

/** Maps only the exact open draft pull request requested by delivery. */
function mapPullRequest(candidate, request) {
  const hasIdentity = Number.isInteger(candidate?.number) && candidate.number > 0
    && candidate?.html_url === `https://github.com/${request.repository}/pull/${candidate.number}`;
  const hasIntent = candidate?.state === "open" && candidate?.draft === true
    && candidate?.head?.ref === request.headBranch && candidate?.base?.ref === request.baseBranch;
  if (!hasIdentity || !hasIntent) {
    throw new Error("Existing GitHub pull request does not match the approved draft intent.");
  }
  return Object.freeze({ number: candidate.number, url: candidate.html_url, draft: true });
}

/** Creates one encoded repository API route. */
function createRepositoryRoute(repository) {
  const match = REPOSITORY.exec(repository);
  if (match === null) throw new Error("GitHub repository must use owner/name format.");
  return `/repos/${encodeURIComponent(match[1])}/${encodeURIComponent(match[2])}`;
}

/** Creates a stable provider failure without exposing response content. */
function createGitHubError(operation, statusCode) {
  return new Error(`GitHub could not ${operation}; status ${String(statusCode)}.`);
}
