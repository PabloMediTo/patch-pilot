import {
  createPostgresDeliveryObservationStore,
  createPostgresDeliveryStore,
  reconcileGitHubPullRequest,
} from "@patch-pilot/maintenance";

/**
 * Composes persisted pull-request webhook reconciliation for the API runtime.
 *
 * @param {{ pool: object }} options Managed API Postgres pool.
 * @returns {Promise<{ reconcilePullRequestWebhook: Function, close: Function }>} Reconciliation operation and idempotent cleanup.
 */
export async function createGitHubDeliveryReconciliationRuntime(options) {
  assertRuntimeOptions(options);
  const deliveryStore = await createPostgresDeliveryStore({ pool: options.pool });
  const observationStore = await createPostgresDeliveryObservationStore({ pool: options.pool });
  const lifecycle = createLifecycle(options.pool);
  return Object.freeze({
    reconcilePullRequestWebhook: async (input) => {
      lifecycle.assertOpen();
      return reconcileGitHubPullRequest({ ...input,
        loadDeliveryByPullRequest: deliveryStore.getByPullRequest,
        saveObservation: observationStore.saveObservation });
    },
    close: lifecycle.close,
  });
}

/** Validates the managed persistence lifecycle before composing stores. */
function assertRuntimeOptions(options) {
  if (typeof options?.pool?.query !== "function" || typeof options.pool.end !== "function") {
    throw new Error("GitHub delivery reconciliation requires one managed Postgres pool.");
  }
}

/** Prevents webhook reconciliation after idempotent shutdown begins. */
function createLifecycle(pool) {
  let isClosed = false;
  let closePromise;
  return Object.freeze({
    assertOpen: () => {
      if (isClosed) throw new Error("GitHub delivery reconciliation is closed.");
    },
    close: () => {
      isClosed = true;
      closePromise ??= Promise.resolve().then(() => pool.end());
      return closePromise;
    },
  });
}
