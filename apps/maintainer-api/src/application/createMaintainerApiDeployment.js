import {
  createGitHubAppRequest,
  createPostgresApprovalStore,
  createPostgresMaintenanceRunStore,
  createPostgresRunReviewStore,
  createPostgresRunTimelineStore,
  createRedisRunTimelineStream,
} from "@patch-pilot/maintenance";
import pg from "pg";

import { createGitHubDeliveryReconciliationRuntime } from "../github-delivery/index.js";
import { createGitHubWebhookIngestion } from "../github-ingestion/index.js";
import { createTemporalApprovalNotifier } from "../workflow-approval/index.js";
import { createTemporalRunDispatcher } from "../workflow-submission/index.js";
import { createMaintainerApiRuntime } from "./createMaintainerApiRuntime.js";
import { createTemporalClientResource } from "./createTemporalClientResource.js";

const DEFAULT_POSTGRES_URL = "postgres://patch_pilot:patch_pilot@127.0.0.1:5432/patch_pilot";
const DEFAULT_REDIS_URL = "redis://127.0.0.1:6379";
const DEFAULT_TEMPORAL_ADDRESS = "127.0.0.1:7233";
const DEFAULT_TEMPORAL_NAMESPACE = "default";
const DEFAULT_TEMPORAL_TASK_QUEUE = "patch-pilot-maintenance";

/**
 * Composes all stateful API adapters behind one deployment lifecycle.
 *
 * @param {{ environment: object, pool?: object, timelineStream?: object, githubReconciliationRuntime?: object, githubRequest?: Function, temporalResource?: object }} options Environment and optional controlled test resources.
 * @returns {Promise<{ server: object, listen: Function, close: Function }>} API deployment operations.
 */
export async function createMaintainerApiDeployment(options) {
  const config = createDeploymentConfig(options?.environment);
  const pool = options?.pool ?? new pg.Pool({ connectionString: config.postgresUrl });
  let timelineStream, githubReconciliationRuntime, temporalResource;

  try {
    timelineStream = options?.timelineStream
      ?? await createRedisRunTimelineStream({ url: config.redisUrl });
    temporalResource = await createWorkflowCommandResource({
      resource: options?.temporalResource, config });
    githubReconciliationRuntime = options?.githubReconciliationRuntime
      ?? await createGitHubDeliveryReconciliationRuntime({ pool });
    const requestGitHub = options?.githubRequest ?? createGitHubAppRequest({
      appId: config.githubAppId, privateKey: config.githubAppPrivateKey,
      permissions: { contents: "read" } });
    const [reviewStore, timelineStore, approvalStore, runStore] = await Promise.all([
      createPostgresRunReviewStore({ pool }),
      createPostgresRunTimelineStore({ pool }),
      createPostgresApprovalStore({ pool }),
      createPostgresMaintenanceRunStore({ pool }),
    ]);
    const ingestWebhook = createGitHubWebhookIngestion({ requestGitHub,
      saveSubmittedRun: runStore.saveSubmittedRun,
      dispatchRun: temporalResource.dispatchRun,
      reconcilePullRequestWebhook: githubReconciliationRuntime.reconcilePullRequestWebhook });
    const runtime = createMaintainerApiRuntime({ environment: options.environment,
      githubWebhook: { secret: config.githubWebhookSecret,
        ingestWebhook },
      reviewStore, timelineStore, approvalStore, timelineStream,
      notifyApprovalDecision: temporalResource.notifyApprovalDecision });
    const lifecycle = createDeploymentLifecycle({ ...runtime, timelineStream,
      temporalResource,
      githubReconciliationRuntime, host: config.host, port: config.port });
    return Object.freeze({ server: runtime.server, listen: lifecycle.listen,
      close: lifecycle.close });
  } catch (error) {
    await closeFailedComposition({ pool, timelineStream, temporalResource,
      githubReconciliationRuntime });
    throw error;
  }
}

/** Shares one Temporal client lifecycle across independent workflow commands. */
async function createWorkflowCommandResource(input) {
  let resource;
  try {
    resource = input.resource ?? await createTemporalClientResource({
      address: input.config.temporalAddress, namespace: input.config.temporalNamespace });
    return Object.freeze({ client: resource.client,
      close: () => resource.close(),
      dispatchRun: createTemporalRunDispatcher({ client: resource.client,
        taskQueue: input.config.temporalTaskQueue }),
      notifyApprovalDecision: createTemporalApprovalNotifier({ client: resource.client }),
    });
  } catch (error) {
    await resource?.close?.();
    throw error;
  }
}

/** Validates security material, service locations, and listener coordinates. */
function createDeploymentConfig(environment) {
  const port = Number(environment?.PATCH_PILOT_API_PORT ?? "3001");
  const host = environment?.PATCH_PILOT_API_HOST ?? "127.0.0.1";
  const githubWebhookSecret = environment?.PATCH_PILOT_GITHUB_WEBHOOK_SECRET;
  const githubAppId = environment?.PATCH_PILOT_GITHUB_APP_ID;
  const githubAppPrivateKey = environment?.PATCH_PILOT_GITHUB_APP_PRIVATE_KEY;
  const temporalAddress = environment?.PATCH_PILOT_TEMPORAL_ADDRESS ?? DEFAULT_TEMPORAL_ADDRESS;
  const temporalNamespace = environment?.PATCH_PILOT_TEMPORAL_NAMESPACE ?? DEFAULT_TEMPORAL_NAMESPACE;
  const temporalTaskQueue = environment?.PATCH_PILOT_TEMPORAL_TASK_QUEUE
    ?? DEFAULT_TEMPORAL_TASK_QUEUE;
  const hasStrings = [host, githubWebhookSecret, githubAppId, githubAppPrivateKey,
    temporalAddress, temporalNamespace, temporalTaskQueue]
    .every((value) => typeof value === "string" && value.trim() !== "");
  if (!hasStrings || !Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error("API deployment requires valid listener and GitHub App environment values.");
  }
  return Object.freeze({ host, port, githubWebhookSecret, githubAppId, githubAppPrivateKey,
    postgresUrl: environment.PATCH_PILOT_POSTGRES_URL ?? DEFAULT_POSTGRES_URL,
    redisUrl: environment.PATCH_PILOT_REDIS_URL ?? DEFAULT_REDIS_URL,
    temporalAddress, temporalNamespace, temporalTaskQueue });
}

/** Owns one listener, Redis stream, and shared Postgres pool lifecycle. */
function createDeploymentLifecycle(resources) {
  let closePromise;
  let listenPromise;
  return Object.freeze({
    listen: () => {
      if (closePromise !== undefined) throw new Error("API deployment is closing.");
      listenPromise ??= listen(resources.server, resources.port, resources.host);
      return listenPromise;
    },
    close: () => {
      closePromise ??= (listenPromise ?? Promise.resolve())
        .catch(() => undefined).then(() => closeDeploymentResources(resources));
      return closePromise;
    },
  });
}

/** Starts one Node listener and rejects startup errors. */
function listen(server, port, host) {
  return new Promise((resolve, reject) => {
    const handleError = (error) => { server.off("listening", handleListening); reject(error); };
    const handleListening = () => { server.off("error", handleError); resolve(); };
    server.once("error", handleError);
    server.once("listening", handleListening);
    server.listen(port, host);
  });
}

/** Stops ingress before closing live and durable provider resources. */
async function closeDeploymentResources(resources) {
  const ingressResult = await Promise.allSettled([closeServer(resources.server)]);
  const providerResults = await Promise.allSettled([
    resources.timelineStream.close(),
    resources.temporalResource.close(),
    resources.githubReconciliationRuntime.close(),
  ]);
  const failures = [...ingressResult, ...providerResults]
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason);
  if (failures.length > 0) throw new AggregateError(failures, "API deployment shutdown failed.");
}

/** Closes active HTTP connections, including long-lived SSE sessions. */
function closeServer(server) {
  if (!server.listening) return Promise.resolve();
  return new Promise((resolve, reject) => {
    server.close((error) => error === undefined ? resolve() : reject(error));
    server.closeAllConnections?.();
  });
}

/** Releases partial resources when composition fails before ownership transfers. */
async function closeFailedComposition(resources) {
  const operations = [];
  if (resources.timelineStream !== undefined) operations.push(resources.timelineStream.close());
  if (resources.temporalResource !== undefined) {
    operations.push(resources.temporalResource.close());
  }
  if (resources.githubReconciliationRuntime !== undefined) {
    operations.push(resources.githubReconciliationRuntime.close());
  }
  else operations.push(resources.pool.end());
  await Promise.allSettled(operations);
}
