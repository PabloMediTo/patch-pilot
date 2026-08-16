import { Client, Connection } from "@temporalio/client";

import { createTemporalRunDispatcher } from "./createTemporalRunDispatcher.js";

/**
 * Connects one reusable Temporal client and exposes run submission plus closure.
 *
 * @param {{ address: string, namespace: string, taskQueue: string, connection?: object, client?: object }} input Temporal location and optional controlled resources.
 * @returns {Promise<{ dispatchRun: Function, close: Function }>} Managed submission runtime.
 */
export async function createTemporalRunSubmissionRuntime(input) {
  assertConfig(input);
  const connection = input.connection ?? await Connection.connect({ address: input.address });
  const client = input.client ?? new Client({ connection, namespace: input.namespace });
  const dispatchRun = createTemporalRunDispatcher({ client, taskQueue: input.taskQueue });
  let closePromise;
  return Object.freeze({ dispatchRun,
    close: () => { closePromise ??= connection.close(); return closePromise; } });
}

/** Rejects incomplete Temporal configuration before opening a connection. */
function assertConfig(input) {
  if ([input?.address, input?.namespace, input?.taskQueue]
    .some((value) => typeof value !== "string" || value.trim() === "")) {
    throw new Error("Temporal run submission requires address, namespace, and task queue.");
  }
  if (input.connection !== undefined && typeof input.connection?.close !== "function") {
    throw new Error("Temporal run submission requires a closeable connection.");
  }
}
