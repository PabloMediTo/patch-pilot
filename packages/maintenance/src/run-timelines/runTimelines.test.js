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
  assert.deepEqual(received, { runId: "run-7", sequence: 2 });
  assert.equal(hasUnsubscribed, true);
});

/**
 * Creates a small Redis client test double.
 *
 * @param {string[]} calls Captured operations.
 * @returns {object} Redis client stub.
 */
function createRedisClientStub(calls) {
  return {
    isOpen: false,
    connect: async function connect() { this.isOpen = true; calls.push("connect"); },
    publish: async (channel) => { calls.push(`publish:${channel}`); },
    subscribe: async (channel, receiver) => {
      calls.push(`subscribe:${channel}`);
      receiver(JSON.stringify({ runId: "run-7", sequence: 2 }));
    },
    unsubscribe: async (channel) => { calls.push(`unsubscribe:${channel}`); },
    close: async function close() { this.isOpen = false; calls.push("close"); },
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
