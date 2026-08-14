import assert from "node:assert/strict";

import { openRunTimelineSseSession } from "./openRunTimelineSseSession.js";

const event = Object.freeze({
  eventId: "event-2",
  runId: "run-1",
  sequence: 2,
  type: "verification.completed",
  occurredAt: "2026-08-14T10:00:02.000Z",
  payload: Object.freeze({ status: "passed" }),
});
const frames = [];
let closeResponse;
let heartbeat;
let heartbeatDelay;
let hasCancelledHeartbeat = false;
let hasUnsubscribed = false;
const session = await openRunTimelineSseSession({
  runId: "run-1",
  afterSequence: 1,
  store: { list: async () => [
    { ...event, sequence: 1, eventId: "event-1" },
    event,
  ] },
  stream: {
    subscribe: async () => async () => { hasUnsubscribed = true; },
  },
  response: {
    start: ({ statusCode, headers }) => {
      assert.equal(statusCode, 200);
      assert.equal(headers["content-type"], "text/event-stream; charset=utf-8");
      assert.equal(headers["cache-control"], "no-cache, no-transform");
    },
    write: (frame) => frames.push(frame),
    onClose: (handler) => { closeResponse = handler; },
  },
  scheduleHeartbeat: (callback, delay) => {
    heartbeat = callback;
    heartbeatDelay = delay;
    return () => { hasCancelledHeartbeat = true; };
  },
});

assert.equal(frames.length, 1);
assert.match(frames[0], /^id: 2\nevent: timeline\ndata: /u);
assert.match(frames[0], /"status":"passed"/u);
assert.equal(heartbeatDelay, 15_000);
heartbeat();
assert.equal(frames[1], ": heartbeat\n\n");
await closeResponse();
await session.close();
assert.equal(hasCancelledHeartbeat, true);
assert.equal(hasUnsubscribed, true);

let releaseHistory;
let disconnectDuringCatchUp;
let hasLateUnsubscribed = false;
const pendingSession = openRunTimelineSseSession({
  runId: "run-2",
  store: { list: async () => new Promise((resolve) => { releaseHistory = resolve; }) },
  stream: { subscribe: async () => async () => { hasLateUnsubscribed = true; } },
  response: {
    start: () => undefined,
    write: () => undefined,
    onClose: (handler) => { disconnectDuringCatchUp = handler; },
  },
  scheduleHeartbeat: () => () => undefined,
});
await Promise.resolve();
await disconnectDuringCatchUp();
releaseHistory([]);
await pendingSession;
assert.equal(hasLateUnsubscribed, true);
