const FULL_REVISION = /^[0-9a-f]{40}$/u;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;
const SUPPORTED_ACTIONS = Object.freeze(new Set([
  "opened", "reopened", "synchronize", "converted_to_draft", "ready_for_review", "closed",
]));

/**
 * Reconciles one GitHub pull-request webhook against immutable delivery evidence.
 *
 * @param {{ deliveryId: string, eventName: string, payload: object, observedAt: string, loadDeliveryByPullRequest: Function, saveObservation: Function }} input Webhook identity, parsed payload, and persistence ports.
 * @returns {Promise<object>} Ignored, recorded, replayed, or conflicting reconciliation outcome.
 */
export async function reconcileGitHubPullRequest(input) {
  assertInput(input);
  if (input.eventName !== "pull_request") {
    return Object.freeze({ status: "ignored", reason: "unsupported-event" });
  }
  if (!SUPPORTED_ACTIONS.has(input.payload?.action)) {
    return Object.freeze({ status: "ignored", reason: "unsupported-action" });
  }
  const observed = createObservedState(input);
  const delivery = await input.loadDeliveryByPullRequest(observed.repository,
    observed.pullRequest.number);
  if (delivery === null) return Object.freeze({ status: "ignored", reason: "untracked-pull-request" });
  assertDeliveryEvidence(delivery);
  const observation = createObservation(input, observed, delivery);
  return normalizeSaveResult(await input.saveObservation(observation), observation);
}

/** Rejects incomplete persisted evidence rather than classifying it as provider drift. */
function assertDeliveryEvidence(delivery) {
  const hasIdentity = typeof delivery?.runId === "string" && delivery.runId.trim() !== ""
    && Number.isInteger(delivery?.installationId) && delivery.installationId > 0
    && REPOSITORY.test(delivery?.repository) && Number.isInteger(delivery?.pullRequest?.number)
    && delivery.pullRequest.number > 0;
  const hasGitState = FULL_REVISION.test(delivery?.headRevision)
    && [delivery?.branchName, delivery?.baseBranch, delivery?.pullRequest?.url]
      .every((value) => typeof value === "string" && value.trim() !== "");
  if (!hasIdentity || !hasGitState) {
    throw new Error("GitHub reconciliation loaded malformed delivery evidence.");
  }
}

/** Validates envelope identity and ports before interpreting a supported event. */
function assertInput(input) {
  const hasEnvelope = [input?.deliveryId, input?.eventName, input?.observedAt]
    .every((value) => typeof value === "string" && value.trim() !== "");
  if (!hasEnvelope || typeof input?.payload !== "object" || input.payload === null
    || typeof input.loadDeliveryByPullRequest !== "function"
    || typeof input.saveObservation !== "function" || !Number.isFinite(Date.parse(input.observedAt))) {
    throw new Error("GitHub reconciliation requires a delivery envelope and persistence ports.");
  }
}

/** Maps only the exact pull-request identity and lifecycle fields used for reconciliation. */
function createObservedState(input) {
  const payload = input.payload;
  const candidate = payload.pull_request;
  const repository = payload.repository?.full_name;
  const installationId = payload.installation?.id;
  const number = candidate?.number ?? payload.number;
  const hasIdentity = REPOSITORY.test(repository) && Number.isInteger(installationId)
    && installationId > 0 && Number.isInteger(number) && number > 0
    && candidate?.html_url === `https://github.com/${repository}/pull/${number}`;
  const hasGitState = [candidate?.head?.ref, candidate?.base?.ref]
    .every((value) => typeof value === "string" && value.trim() !== "")
    && FULL_REVISION.test(candidate?.head?.sha);
  const hasLifecycle = ["open", "closed"].includes(candidate?.state)
    && typeof candidate?.draft === "boolean" && typeof candidate?.merged === "boolean";
  if (!hasIdentity || !hasGitState || !hasLifecycle) {
    throw new Error("GitHub pull-request webhook has malformed reconciliation evidence.");
  }
  return Object.freeze({ repository, installationId,
    pullRequest: Object.freeze({ number, url: candidate.html_url, headBranch: candidate.head.ref,
      headRevision: candidate.head.sha, baseBranch: candidate.base.ref, state: candidate.state,
      draft: candidate.draft, merged: candidate.merged }) });
}

/** Creates immutable observation evidence and identifies provider drift. */
function createObservation(input, observed, delivery) {
  const differences = findDifferences(observed, delivery);
  return Object.freeze({ deliveryId: input.deliveryId, runId: delivery.runId,
    action: input.payload.action, repository: observed.repository,
    installationId: observed.installationId, pullRequest: observed.pullRequest,
    reconciliation: Object.freeze({ status: differences.length === 0 ? "matched" : "diverged",
      differences }), observedAt: new Date(input.observedAt).toISOString() });
}

/** Compares immutable provider identities while permitting normal PR lifecycle changes. */
function findDifferences(observed, delivery) {
  const checks = [
    ["installation", observed.installationId === delivery?.installationId],
    ["repository", observed.repository === delivery?.repository],
    ["url", observed.pullRequest.url === delivery?.pullRequest?.url],
    ["head-branch", observed.pullRequest.headBranch === delivery?.branchName],
    ["head-revision", observed.pullRequest.headRevision === delivery?.headRevision],
    ["base-branch", observed.pullRequest.baseBranch === delivery?.baseBranch],
  ];
  return Object.freeze(checks.filter(([, isMatching]) => !isMatching).map(([field]) => field));
}

/** Normalizes first-write persistence and GitHub redelivery replay. */
function normalizeSaveResult(result, observation) {
  if (result?.status === "created") {
    return Object.freeze({ status: "recorded", observation });
  }
  if (hasSameObservation(result?.observation, observation)) {
    return Object.freeze({ status: "replayed", observation: result.observation });
  }
  return Object.freeze({ status: "conflict", reason: "webhook-delivery-conflict" });
}

/** Compares canonical serialized evidence for one unique webhook delivery ID. */
function hasSameObservation(left, right) {
  return left?.deliveryId === right.deliveryId
    && JSON.stringify(createComparableObservation(left))
      === JSON.stringify(createComparableObservation(right));
}

/** Projects an observation into stable field order for replay comparison. */
function createComparableObservation(candidate) {
  return { deliveryId: candidate?.deliveryId, runId: candidate?.runId, action: candidate?.action,
    repository: candidate?.repository, installationId: candidate?.installationId,
    pullRequest: { number: candidate?.pullRequest?.number, url: candidate?.pullRequest?.url,
      headBranch: candidate?.pullRequest?.headBranch,
      headRevision: candidate?.pullRequest?.headRevision,
      baseBranch: candidate?.pullRequest?.baseBranch, state: candidate?.pullRequest?.state,
      draft: candidate?.pullRequest?.draft, merged: candidate?.pullRequest?.merged },
    reconciliation: { status: candidate?.reconciliation?.status,
      differences: candidate?.reconciliation?.differences }, observedAt: candidate?.observedAt };
}
