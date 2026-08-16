import { createPostgresRunTimelineStore, createRedisRunTimelineStream } from "@patch-pilot/maintenance";
import { NativeConnection, Worker } from "@temporalio/worker";
import { fileURLToPath, URL } from "node:url";

import { createMaintenanceWorkflowActivities } from "../maintenance-workflow/index.js";

const WORKFLOWS_PATH = fileURLToPath(new URL("../maintenance-workflow/maintenanceRunWorkflow.js",
  import.meta.url));
const DEFAULT_POSTGRES_URL = "postgres://patch_pilot:patch_pilot@127.0.0.1:5432/patch_pilot";
const DEFAULT_REDIS_URL = "redis://127.0.0.1:6379";

/**
 * Composes one executable Temporal worker and its Activity provider lifecycle.
 *
 * @param {{ environment: object, connection?: object, timelineStore?: object, timelineStream?: object, worker?: object }} options Environment and optional controlled resources.
 * @returns {Promise<{ run: Function, close: Function }>} Worker deployment lifecycle.
 */
export async function createMaintainerWorkerDeployment(options) {
  const config = createConfig(options?.environment);
  let connection, timelineStore, timelineStream;
  try {
    connection = options?.connection ?? await NativeConnection.connect({
      address: config.temporalAddress });
    timelineStore = options?.timelineStore ?? await createPostgresRunTimelineStore({
      connectionString: config.postgresUrl });
    timelineStream = options?.timelineStream ?? await createRedisRunTimelineStream({
      url: config.redisUrl });
    const activities = createMaintenanceWorkflowActivities({ timelineStore, timelineStream,
      workspaceRoot: config.workspaceRoot });
    const worker = options?.worker ?? await Worker.create({ connection,
      namespace: config.temporalNamespace, taskQueue: config.temporalTaskQueue,
      workflowsPath: WORKFLOWS_PATH, activities });
    return createLifecycle({ worker, connection, timelineStore, timelineStream });
  } catch (error) {
    await closeResources({ connection, timelineStore, timelineStream });
    throw error;
  }
}

/** Validates and supplies the worker's local development defaults. */
function createConfig(environment) {
  const config = Object.freeze({
    temporalAddress: environment?.PATCH_PILOT_TEMPORAL_ADDRESS ?? "127.0.0.1:7233",
    temporalNamespace: environment?.PATCH_PILOT_TEMPORAL_NAMESPACE ?? "default",
    temporalTaskQueue: environment?.PATCH_PILOT_TEMPORAL_TASK_QUEUE ?? "patch-pilot-maintenance",
    postgresUrl: environment?.PATCH_PILOT_POSTGRES_URL ?? DEFAULT_POSTGRES_URL,
    redisUrl: environment?.PATCH_PILOT_REDIS_URL ?? DEFAULT_REDIS_URL,
    workspaceRoot: environment?.PATCH_PILOT_WORKSPACE_ROOT ?? ".patch-pilot/workspaces",
  });
  if (Object.values(config).some((value) => typeof value !== "string" || value.trim() === "")) {
    throw new Error("Worker deployment requires valid Temporal, storage, and workspace values.");
  }
  return config;
}

/** Coordinates polling shutdown before provider resources are released. */
function createLifecycle(resources) {
  let runPromise, closePromise;
  return Object.freeze({
    run: () => {
      if (closePromise !== undefined) throw new Error("Worker deployment is closing.");
      runPromise ??= resources.worker.run();
      return runPromise;
    },
    close: () => {
      if (closePromise === undefined) {
        resources.worker.shutdown();
        closePromise = (runPromise ?? Promise.resolve()).catch(() => undefined)
          .then(() => closeResources(resources));
      }
      return closePromise;
    },
  });
}

/** Closes every created provider and reports all cleanup failures together. */
async function closeResources(resources) {
  const operations = [resources.timelineStream?.close?.(), resources.timelineStore?.close?.(),
    resources.connection?.close?.()].filter((operation) => operation !== undefined);
  const results = await Promise.allSettled(operations);
  const failures = results.filter((result) => result.status === "rejected")
    .map((result) => result.reason);
  if (failures.length > 0) throw new AggregateError(failures, "Worker shutdown failed.");
}
