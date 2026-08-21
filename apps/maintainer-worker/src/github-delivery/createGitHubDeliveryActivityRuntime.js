import {
  createGitHubAppRequest,
  createGitHubCommitPublisher,
  createGitHubDeliveryAdapter,
  createPostgresApprovalStore,
  createPostgresDeliveryStore,
  publishApprovedPullRequest,
} from "@patch-pilot/maintenance";
import pg from "pg";

/**
 * Composes the credentialed, persisted GitHub delivery Activity and its pool lifecycle.
 *
 * @param {{ connectionString: string, appId: string | number, privateKey: string, pool?: object, approvalStore?: object, deliveryStore?: object, provider?: object, fetchImpl?: Function, clock?: Function }} options Delivery configuration and controlled provider seams.
 * @returns {Promise<{ deliverApprovedPullRequest: Function, close: Function }>} Delivery Activity and idempotent cleanup.
 */
export async function createGitHubDeliveryActivityRuntime(options) {
  const pool = options?.pool ?? new pg.Pool({ connectionString: options?.connectionString });
  try {
    assertOptions(options, pool);
    const clock = options.clock ?? (() => new Date());
    const approvalStore = options.approvalStore ?? await createPostgresApprovalStore({ pool });
    const deliveryStore = options.deliveryStore ?? await createPostgresDeliveryStore({ pool });
    const provider = options.provider ?? createProvider({ ...options, clock });
    const lifecycle = createLifecycle(pool);
    return Object.freeze({
      deliverApprovedPullRequest: async (input) => {
        lifecycle.assertOpen();
        assertRunIdentity(input?.runId);
        const approval = await approvalStore.get(input.runId);
        return publishApprovedPullRequest(createDeliveryInput({ input, approval,
          deliveryStore, provider, clock }));
      },
      close: lifecycle.close,
    });
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/** Creates concrete GitHub publication ports behind one authenticated request boundary. */
function createProvider(options) {
  const requestGitHub = createGitHubAppRequest(options);
  const publishCommit = createGitHubCommitPublisher({ requestGitHub });
  return createGitHubDeliveryAdapter({ requestGitHub, publishCommit });
}

/** Validates the owned pool and production provider configuration. */
function assertOptions(options, pool) {
  const hasPool = typeof pool?.query === "function" && typeof pool.end === "function";
  const hasControlledProvider = typeof options?.provider?.publishBranch === "function"
    && typeof options.provider.ensureDraftPullRequest === "function";
  const hasCredentials = [options?.connectionString, String(options?.appId ?? ""),
    options?.privateKey].every((value) => typeof value === "string" && value.trim() !== "");
  if (!hasPool || (!hasControlledProvider && !hasCredentials)) {
    throw new Error("GitHub delivery Activity requires storage and GitHub App configuration.");
  }
}

/** Rejects malformed identities before loading canonical approval evidence. */
function assertRunIdentity(runId) {
  if (typeof runId !== "string" || runId.trim() === "") {
    throw new Error("GitHub delivery Activity requires a run identity.");
  }
}

/** Builds the exact delivery use-case input without accepting caller-owned ports. */
function createDeliveryInput(context) {
  const { input, approval, deliveryStore, provider, clock } = context;
  return Object.freeze({ ...input, approval, loadDelivery: deliveryStore.get,
    publishBranch: provider.publishBranch,
    ensureDraftPullRequest: provider.ensureDraftPullRequest,
    saveDelivery: deliveryStore.saveDelivery, clock });
}

/** Prevents new Activity calls after idempotent shutdown begins. */
function createLifecycle(pool) {
  let isClosed = false;
  let closePromise;
  return Object.freeze({
    assertOpen: () => {
      if (isClosed) throw new Error("GitHub delivery Activity runtime is closed.");
    },
    close: () => {
      isClosed = true;
      closePromise ??= Promise.resolve().then(() => pool.end());
      return closePromise;
    },
  });
}
