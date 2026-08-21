/**
 * Creates the Redis live timeline publisher and subscriber adapter.
 *
 * @param {{ url?: string, publisher?: object, subscriber?: object, createClient?: Function }} [options] Redis URL, clients, or client factory.
 * @returns {Promise<object>} Publish, subscribe, and close operations.
 */
export async function createRedisRunTimelineStream(options = {}) {
  const publisher = options.publisher ?? await createRedisClient(options.url, options.createClient);
  const subscriber = options.subscriber ?? publisher.duplicate();
  attachRedisErrorListener(publisher);
  attachRedisErrorListener(subscriber);
  let publisherConnection;
  let subscriberConnection;

  return Object.freeze({
    publish: async (event) => {
      publisherConnection ??= connectClient(publisher);
      await publisherConnection;
      await publisher.publish(createChannel(event.runId), JSON.stringify(event));
    },
    subscribe: async (runId, receiveEvent) => {
      if (typeof receiveEvent !== "function") {
        throw new Error("Timeline subscription requires an event receiver.");
      }
      subscriberConnection ??= connectClient(subscriber);
      await subscriberConnection;
      const channel = createChannel(runId);
      await subscriber.subscribe(channel, (message) => receiveEvent(JSON.parse(message)));
      return async () => subscriber.unsubscribe(channel);
    },
    close: async () => {
      await closeClient(subscriber);
      await closeClient(publisher);
    },
  });
}

/**
 * Prevents the provider's parallel error event from bypassing rejected operation promises.
 *
 * @param {object} client Redis client.
 */
function attachRedisErrorListener(client) {
  if (typeof client.on === "function") client.on("error", handleRedisClientError);
}

/** Leaves operation failures to connect, publish, and subscribe promises. */
function handleRedisClientError() {
  return undefined;
}

/**
 * Loads the Redis provider only for a concrete runtime connection.
 *
 * @param {string | undefined} url Redis connection URL.
 * @param {Function | undefined} clientFactory Optional provider factory.
 * @returns {Promise<object>} Redis client.
 */
async function createRedisClient(url, clientFactory) {
  const factory = clientFactory ?? (await import("redis")).createClient;
  return factory({ url, socket: {
    connectTimeout: 5_000,
    reconnectStrategy: createReconnectStrategy,
  } });
}

/** Bounds provider reconnection so unavailable Redis cannot hang startup indefinitely. */
function createReconnectStrategy(retries) {
  return retries >= 5 ? new Error("Timeline Redis connection retry limit reached.")
    : Math.min(100 * (retries + 1), 500);
}

/**
 * Creates the namespaced Redis channel for one run.
 *
 * @param {unknown} runId Run identifier.
 * @returns {string} Channel name.
 * @throws {Error} When the run identifier is invalid.
 */
function createChannel(runId) {
  if (typeof runId !== "string" || runId.trim() === "") {
    throw new Error("Timeline stream requires a run ID.");
  }
  return `patch-pilot:run:${runId}:timeline`;
}

/**
 * Connects a Redis client only when it is not already open.
 *
 * @param {object} client Redis client.
 * @returns {Promise<void>} Connection completion.
 */
async function connectClient(client) {
  if (!client.isOpen) {
    await client.connect();
  }
}

/**
 * Closes an open Redis client.
 *
 * @param {object} client Redis client.
 * @returns {Promise<void>} Close completion.
 */
async function closeClient(client) {
  if (client.isOpen) {
    await client.close();
  }
}
