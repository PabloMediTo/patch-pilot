import assert from "node:assert/strict";

import { openRunTimelineFeed } from "./openRunTimelineFeed.js";

const createEvent = (sequence) => Object.freeze({
  eventId: `event-${sequence}`,
  runId: "run-1",
  sequence,
  type: "step.completed",
  occurredAt: `2026-08-14T10:00:0${sequence}.000Z`,
  payload: Object.freeze({}),
});

const emitted = [];
let receiveLiveEvent;
let hasUnsubscribed = false;
const feed = await openRunTimelineFeed({
  runId: "run-1",
  store: { list: async () => [createEvent(1), createEvent(2)] },
  stream: {
    subscribe: async (runId, receiver) => {
      assert.equal(runId, "run-1");
      receiveLiveEvent = receiver;
      receiver(createEvent(3));
      return async () => { hasUnsubscribed = true; };
    },
  },
  emitEvent: (event) => emitted.push(event.sequence),
});

assert.deepEqual(emitted, [1, 2, 3]);
receiveLiveEvent(createEvent(2));
receiveLiveEvent(createEvent(4));
assert.deepEqual(emitted, [1, 2, 3, 4]);
await feed.close();
assert.equal(hasUnsubscribed, true);

let hasCleanedUp = false;
await assert.rejects(
  openRunTimelineFeed({
    runId: "run-1",
    store: { list: async () => { throw new Error("Postgres unavailable"); } },
    stream: {
      subscribe: async () => async () => { hasCleanedUp = true; },
    },
    emitEvent: () => undefined,
  }),
  /Postgres unavailable/u,
);
assert.equal(hasCleanedUp, true);

assert.throws(
  () => receiveLiveEvent({ runId: "another-run", sequence: 5 }),
  /cross-run event/u,
);
