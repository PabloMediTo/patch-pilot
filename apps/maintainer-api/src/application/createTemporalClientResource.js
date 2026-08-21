import { Client, Connection } from "@temporalio/client";

/**
 * Creates one API-owned Temporal client resource shared by workflow commands.
 *
 * @param {{ address: string, namespace: string, connection?: object, client?: object }} input Temporal location and optional controlled providers.
 * @returns {Promise<{ client: object, close: Function }>} Shared client and idempotent closure.
 */
export async function createTemporalClientResource(input) {
  assertConfig(input);
  const connection = input.connection ?? await Connection.connect({ address: input.address });
  const client = input.client ?? new Client({ connection, namespace: input.namespace });
  assertClient(client);
  let closePromise;
  return Object.freeze({ client,
    close: () => { closePromise ??= connection.close(); return closePromise; } });
}

/** Requires a namespace, address, and optional closeable connection. */
function assertConfig(input) {
  if ([input?.address, input?.namespace]
    .some((value) => typeof value !== "string" || value.trim() === "")) {
    throw new Error("Temporal client resource requires address and namespace.");
  }
  if (input.connection !== undefined && typeof input.connection?.close !== "function") {
    throw new Error("Temporal client resource requires a closeable connection.");
  }
}

/** Requires both Temporal command surfaces used by the API. */
function assertClient(client) {
  if (typeof client?.workflow?.start !== "function"
    || typeof client.workflow.getHandle !== "function") {
    throw new Error("Temporal client resource requires workflow start and handle ports.");
  }
}
