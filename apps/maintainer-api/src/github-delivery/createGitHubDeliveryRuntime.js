import {
  createGitHubAppRequest,
  createGitHubCommitPublisher,
  createGitHubDeliveryAdapter,
  createPostgresApprovalStore,
  createPostgresDeliveryObservationStore,
  createPostgresDeliveryStore,
  publishApprovedPullRequest,
  reconcileGitHubPullRequest,
} from "@patch-pilot/maintenance";

/**
 * Composes the authenticated, persisted GitHub delivery path for the API runtime.
 *
 * @param {{ pool: object, appId: string | number, privateKey: string, fetchImpl?: Function, clock?: Function, apiBaseUrl?: string, apiVersion?: string, timeoutMs?: number, maxResponseBytes?: number }} options Deployment resources and GitHub App configuration.
 * @returns {Promise<{ deliverApprovedPullRequest: Function, reconcilePullRequestWebhook: Function, close: Function }>} Delivery operations and idempotent lifecycle close.
 */
export async function createGitHubDeliveryRuntime(options) {
  assertRuntimeOptions(options);
  const clock = options.clock ?? (() => new Date());
  const requestGitHub = createGitHubAppRequest({ ...options, clock });
  const approvalStore = await createPostgresApprovalStore({ pool: options.pool });
  const deliveryStore = await createPostgresDeliveryStore({ pool: options.pool });
  const observationStore = await createPostgresDeliveryObservationStore({ pool: options.pool });
  const publishCommit = createGitHubCommitPublisher({ requestGitHub });
  const provider = createGitHubDeliveryAdapter({ requestGitHub, publishCommit });
  const lifecycle = createLifecycle(options.pool);

  return Object.freeze({
    deliverApprovedPullRequest: async (input) => {
      lifecycle.assertOpen();
      assertRunIdentity(input?.runId);
      const approval = await approvalStore.get(input.runId);
      return publishApprovedPullRequest(createDeliveryInput({ input, approval, deliveryStore,
        provider, clock }));
    },
    reconcilePullRequestWebhook: async (input) => {
      lifecycle.assertOpen();
      return reconcileGitHubPullRequest({ ...input,
        loadDeliveryByPullRequest: deliveryStore.getByPullRequest,
        saveObservation: observationStore.saveObservation });
    },
    close: lifecycle.close,
  });
}

/** Validates concrete deployment resources before constructing adapters. */
function assertRuntimeOptions(options) {
  if (typeof options?.pool?.query !== "function" || typeof options.pool.end !== "function") {
    throw new Error("GitHub delivery runtime requires one managed Postgres pool.");
  }
}

/** Rejects malformed identities before querying persisted approval state. */
function assertRunIdentity(runId) {
  if (typeof runId !== "string" || runId.trim() === "") {
    throw new Error("GitHub delivery runtime requires a run identity.");
  }
}

/** Creates exact use-case input without permitting caller-supplied port replacement. */
function createDeliveryInput(context) {
  const { input, approval, deliveryStore, provider, clock } = context;
  return Object.freeze({ runId: input.runId, installationId: input.installationId,
    repository: input.repository, issueNumber: input.issueNumber, baseBranch: input.baseBranch,
    proposal: input.proposal, approval, loadDelivery: deliveryStore.get,
    publishBranch: provider.publishBranch,
    ensureDraftPullRequest: provider.ensureDraftPullRequest,
    saveDelivery: deliveryStore.saveDelivery, clock });
}

/** Owns idempotent shutdown and prevents work after shutdown starts. */
function createLifecycle(pool) {
  let isClosed = false;
  let closePromise;
  return Object.freeze({
    assertOpen: () => {
      if (isClosed) throw new Error("GitHub delivery runtime is closed.");
    },
    close: () => {
      isClosed = true;
      closePromise ??= Promise.resolve().then(() => pool.end());
      return closePromise;
    },
  });
}
