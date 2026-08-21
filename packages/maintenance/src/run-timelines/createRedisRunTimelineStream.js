/**
 * Creates the Redis live timeline publisher and subscriber adapter.
 *
 * @param {{ url?: string, publisher?: object, subscriber?: object, createClient?: Function }} [options] Redis URL, clients, or client factory.
 * @returns {Promise<object>} Publish, subscribe, and close operations.
 */
export async function createRedisRunTimelineStream(options = {}) {
  const ownsPublisher = options.publisher === undefined;
  const ownsSubscriber = options.subscriber === undefined;
  const publisher = options.publisher ?? await createRedisClient(options.url, options.createClient);
  const subscriber = options.subscriber ?? publisher.duplicate();
  const detachPublisherErrorListener = attachRedisErrorListener(publisher);
  const detachSubscriberErrorListener = attachRedisErrorListener(subscriber);
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
      await subscriber.subscribe(channel, (message) => {
        const event = parseTimelineMessage(message, runId);
        if (event !== undefined) receiveEvent(event);
      });
      return async () => subscriber.unsubscribe(channel);
    },
    close: async () => {
      detachSubscriberErrorListener();
      detachPublisherErrorListener();
      await closeOwnedClients({ publisher, subscriber, ownsPublisher, ownsSubscriber });
    },
  });
}

/**
 * Treats Redis as an untrusted delivery hint and rejects malformed or cross-run messages.
 * Postgres remains the canonical source used to repair a discarded live delivery.
 *
 * @param {unknown} message Redis message body.
 * @param {string} runId Subscribed run identifier.
 * @returns {object | undefined} Valid timeline event or no live delivery.
 */
function parseTimelineMessage(message, runId) {
  let event;
  try {
    event = JSON.parse(message);
  } catch {
    return undefined;
  }
  if (!isTimelineEvent(event, runId)) return undefined;
  return event;
}

/** Validates the canonical fields required by downstream ordering and rendering. */
function isTimelineEvent(event, runId) {
  return event !== null
    && typeof event === "object"
    && typeof event.eventId === "string"
    && event.eventId.trim() !== ""
    && event.runId === runId
    && Number.isSafeInteger(event.sequence)
    && event.sequence > 0
    && typeof event.type === "string"
    && event.type.trim() !== ""
    && typeof event.occurredAt === "string"
    && isCanonicalUtcTimestamp(event.occurredAt)
    && event.payload !== null
    && typeof event.payload === "object";
}

/** Requires the same canonical UTC timestamp representation emitted by persisted events. */
function isCanonicalUtcTimestamp(value) {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value;
}

/**
 * Prevents the provider's parallel error event from bypassing rejected operation promises.
 *
 * @param {object} client Redis client.
 * @returns {Function} Idempotent listener removal.
 */
function attachRedisErrorListener(client) {
  if (typeof client.on !== "function") return () => undefined;
  client.on("error", handleRedisClientError);
  let isAttached = true;
  return () => {
    if (!isAttached) return;
    isAttached = false;
    if (typeof client.off === "function") client.off("error", handleRedisClientError);
    else if (typeof client.removeListener === "function") {
      client.removeListener("error", handleRedisClientError);
    }
  };
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

/** Attempts every owned-client cleanup and preserves all resulting failures. */
async function closeOwnedClients({ publisher, subscriber, ownsPublisher, ownsSubscriber }) {
  const operations = [];
  if (ownsSubscriber) operations.push(closeClient(subscriber));
  if (ownsPublisher) operations.push(closeClient(publisher));
  const results = await Promise.allSettled(operations);
  const failures = results.filter(({ status }) => status === "rejected")
    .map(({ reason }) => reason);
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) throw new AggregateError(failures, "Timeline Redis cleanup failed.");
}
