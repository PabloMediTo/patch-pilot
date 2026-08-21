import assert from "node:assert/strict";

import {
  createPostgresRunTimelineStore,
  createRedisRunTimelineStream,
  listRunTimeline,
  recordRunTimelineEvent,
} from "./index.js";

await runTest("persists before streaming and returns the canonical stored event", async () => {
  const operations = [];
  const storedEvent = Object.freeze({
    eventId: "event-1",
    runId: "run-1",
    sequence: 1,
    type: "reproduction.completed",
    occurredAt: "2026-08-14T10:00:00.000Z",
    payload: Object.freeze({ evidence: Object.freeze({ status: "reproduced" }) }),
  });
  const result = await recordRunTimelineEvent({
    runId: "run-1",
    type: "reproduction.completed",
    payload: { evidence: { status: "reproduced" } },
    createId: () => "event-1",
    clock: () => new Date("2026-08-14T10:00:00.000Z"),
    store: { append: async (candidate) => {
      operations.push("persist");
      assert.ok(Object.isFrozen(candidate.payload.evidence));
      return storedEvent;
    } },
    stream: { publish: async (event) => { operations.push("stream"); assert.equal(event, storedEvent); } },
  });

  assert.equal(result.status, "persisted-and-streamed");
  assert.deepEqual(operations, ["persist", "stream"]);
  assert.ok(Object.isFrozen(result.event.payload.evidence));
});

await runTest("retains canonical persistence when Redis publication fails", async () => {
  const event = Object.freeze({ eventId: "event-2", runId: "run-1", sequence: 2 });
  const result = await recordRunTimelineEvent({
    runId: "run-1",
    type: "verification.failed",
    payload: {},
    createId: () => "event-2",
    clock: () => new Date("2026-08-14T10:01:00.000Z"),
    store: { append: async () => event },
    stream: { publish: async () => { throw new Error("Redis unavailable"); } },
  });

  assert.equal(result.status, "persisted-stream-failed");
  assert.equal(result.event, event);
  assert.deepEqual(result.streamError, { message: "Redis unavailable" });
});

await runTest("initializes Postgres once and maps ordered timeline rows", async () => {
  const queries = [];
  const row = {
    event_id: "event-1",
    run_id: "run-1",
    sequence: "1",
    event_type: "run.submitted",
    occurred_at: "2026-08-14T10:00:00.000Z",
    payload: { nested: { second: 2, first: 1 }, issue: 42 },
  };
  const pool = {
    query: async (sql, values) => {
      queries.push({ sql, values });
      if (sql.includes("CREATE TABLE")) return { rows: [] };
      return { rows: [row] };
    },
    end: async () => undefined,
  };
  const store = await createPostgresRunTimelineStore({ pool });
  await store.append({
    eventId: "event-1",
    runId: "run-1",
    type: "run.submitted",
    occurredAt: "2026-08-14T10:00:00.000Z",
    payload: { issue: 42, nested: { first: 1, second: 2 } },
  });
  const events = await listRunTimeline({ runId: "run-1", store });

  assert.equal(queries.filter(({ sql }) => sql.includes("CREATE TABLE")).length, 1);
  assert.match(queries[1].sql, /ON CONFLICT \(run_id\) DO UPDATE/u);
  assert.match(queries[1].sql, /ON CONFLICT \(event_id\) DO UPDATE/u);
  assert.match(queries[2].sql, /ORDER BY sequence ASC/u);
  assert.deepEqual(events[0], {
    eventId: "event-1",
    runId: "run-1",
    sequence: 1,
    type: "run.submitted",
    occurredAt: "2026-08-14T10:00:00.000Z",
    payload: { nested: { second: 2, first: 1 }, issue: 42 },
  });

  await assert.rejects(store.append({ eventId: "event-1", runId: "run-2",
    type: "run.submitted", occurredAt: "2026-08-14T10:00:00.000Z",
    payload: { issue: 42, nested: { first: 1, second: 2 } } }), /different evidence/u);
});

await runTest("bounds Postgres connection and query behavior", async () => {
  let poolConfiguration;
  let hasClosed = false;
  const store = await createPostgresRunTimelineStore({
    connectionString: "postgres://controlled",
    createPool: (configuration) => {
      poolConfiguration = configuration;
      return { end: async () => { hasClosed = true; } };
    },
  });

  assert.deepEqual(poolConfiguration, {
    connectionString: "postgres://controlled",
    connectionTimeoutMillis: 5_000,
    query_timeout: 10_000,
    statement_timeout: 10_000,
  });
  await store.close();
  assert.equal(hasClosed, true);
});

await runTest("publishes and subscribes through one run-scoped Redis channel", async () => {
  const calls = [];
  const publisher = createRedisClientStub(calls);
  const subscriber = createRedisClientStub(calls);
  const stream = await createRedisRunTimelineStream({ publisher, subscriber });
  let received;
  let hasUnsubscribed = false;

  await stream.publish({ runId: "run-7", sequence: 1 });
  const unsubscribe = await stream.subscribe("run-7", (event) => { received = event; });
  await unsubscribe();
  hasUnsubscribed = calls.includes("unsubscribe:patch-pilot:run:run-7:timeline");
  await stream.close();

  assert.deepEqual(calls.slice(0, 4), [
    "connect",
    "publish:patch-pilot:run:run-7:timeline",
    "connect",
    "subscribe:patch-pilot:run:run-7:timeline",
  ]);
  assert.deepEqual(received, createRedisTimelineEvent());
  assert.equal(hasUnsubscribed, true);
  assert.equal(calls.includes("close"), false);
});

await runTest("closes only Redis clients owned by the adapter", async () => {
  const publisherCalls = [];
  const subscriberCalls = [];
  const publisher = createRedisClientStub(publisherCalls);
  const subscriber = createRedisClientStub(subscriberCalls);
  publisher.isOpen = true;
  subscriber.isOpen = true;
  publisher.duplicate = () => subscriber;
  const stream = await createRedisRunTimelineStream({ publisher });

  await stream.close();

  assert.deepEqual(subscriberCalls, ["close"]);
  assert.deepEqual(publisherCalls, []);
});

await runTest("closes both Redis clients created by the adapter", async () => {
  const publisherCalls = [];
  const subscriberCalls = [];
  const publisher = createRedisClientStub(publisherCalls);
  const subscriber = createRedisClientStub(subscriberCalls);
  publisher.isOpen = true;
  subscriber.isOpen = true;
  publisher.duplicate = () => subscriber;
  const stream = await createRedisRunTimelineStream({
    createClient: () => publisher,
  });

  await stream.close();

  assert.deepEqual(subscriberCalls, ["close"]);
  assert.deepEqual(publisherCalls, ["close"]);
});

await runTest("discards malformed and cross-run Redis timeline messages", async () => {
  const subscriber = createRedisClientStub([]);
  subscriber.subscribe = async (_channel, receiver) => {
    receiver("not-json");
    receiver(JSON.stringify({ ...createRedisTimelineEvent(), runId: "run-other" }));
    receiver(JSON.stringify({ ...createRedisTimelineEvent(), sequence: 0 }));
    receiver(JSON.stringify(createRedisTimelineEvent()));
  };
  const stream = await createRedisRunTimelineStream({
    publisher: createRedisClientStub([]), subscriber,
  });
  const received = [];

  await assert.doesNotReject(stream.subscribe("run-7", (event) => received.push(event)));

  assert.deepEqual(received, [createRedisTimelineEvent()]);
});

await runTest("contains Redis error events while operation promises remain visible", async () => {
  const errorListeners = [];
  const publisher = createRedisClientStub([], errorListeners);
  const subscriber = createRedisClientStub([], errorListeners);
  publisher.connect = async () => {
    errorListeners[0](new Error("provider event"));
    throw new Error("Redis unavailable");
  };
  const stream = await createRedisRunTimelineStream({ publisher, subscriber });

  assert.equal(errorListeners.length, 2);
  await assert.rejects(stream.publish({ runId: "run-8", sequence: 1 }), /Redis unavailable/u);
  assert.doesNotThrow(() => errorListeners[1](new Error("subscriber event")));
});

await runTest("bounds Redis connection and reconnect behavior", async () => {
  let clientConfiguration;
  const publisher = createRedisClientStub([]);
  publisher.duplicate = () => createRedisClientStub([]);
  const stream = await createRedisRunTimelineStream({ url: "redis://controlled",
    createClient: (configuration) => {
      clientConfiguration = configuration;
      return publisher;
    } });

  assert.equal(clientConfiguration.url, "redis://controlled");
  assert.equal(clientConfiguration.socket.connectTimeout, 5_000);
  assert.deepEqual([0, 1, 4].map(clientConfiguration.socket.reconnectStrategy), [100, 200, 500]);
  assert.match(clientConfiguration.socket.reconnectStrategy(5).message, /retry limit reached/u);
  await stream.close();
});

/**
 * Creates a small Redis client test double.
 *
 * @param {string[]} calls Captured operations.
 * @param {Function[]} [errorListeners] Captured provider error listeners.
 * @returns {object} Redis client stub.
 */
function createRedisClientStub(calls, errorListeners = []) {
  return {
    isOpen: false,
    on: (event, listener) => { if (event === "error") errorListeners.push(listener); },
    connect: async function connect() { this.isOpen = true; calls.push("connect"); },
    publish: async (channel) => { calls.push(`publish:${channel}`); },
    subscribe: async (channel, receiver) => {
      calls.push(`subscribe:${channel}`);
      receiver(JSON.stringify(createRedisTimelineEvent()));
    },
    unsubscribe: async (channel) => { calls.push(`unsubscribe:${channel}`); },
    close: async function close() { this.isOpen = false; calls.push("close"); },
  };
}

/** Returns one complete canonical event delivered through the Redis test double. */
function createRedisTimelineEvent() {
  return {
    eventId: "event-redis-2",
    runId: "run-7",
    sequence: 2,
    type: "inspection.completed",
    occurredAt: "2026-08-14T10:02:00.000Z",
    payload: { status: "ready" },
  };
}

/**
 * Executes one named assertion group.
 *
 * @param {string} name Human-readable group name.
 * @param {Function} assertionGroup Assertions to execute.
 * @returns {Promise<void>} Completion after assertions pass.
 */
async function runTest(name, assertionGroup) {
  assert.notEqual(name.trim(), "");
  await assertionGroup();
}
