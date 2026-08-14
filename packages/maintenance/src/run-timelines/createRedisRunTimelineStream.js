/**
 * Creates the Redis live timeline publisher and subscriber adapter.
 *
 * @param {{ url?: string, publisher?: object, subscriber?: object }} [options] Redis URL or injected clients.
 * @returns {Promise<object>} Publish, subscribe, and close operations.
 */
export async function createRedisRunTimelineStream(options = {}) {
  const publisher = options.publisher ?? await createRedisClient(options.url);
  const subscriber = options.subscriber ?? publisher.duplicate();
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
      await subscriber.subscribe(createChannel(runId), (message) => receiveEvent(JSON.parse(message)));
    },
    close: async () => {
      await closeClient(subscriber);
      await closeClient(publisher);
    },
  });
}

/**
 * Loads the Redis provider only for a concrete runtime connection.
 *
 * @param {string | undefined} url Redis connection URL.
 * @returns {Promise<object>} Redis client.
 */
async function createRedisClient(url) {
  const { createClient } = await import("redis");
  return createClient({ url });
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
