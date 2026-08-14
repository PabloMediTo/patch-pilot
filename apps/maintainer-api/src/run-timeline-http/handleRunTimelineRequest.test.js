import assert from "node:assert/strict";

import { handleRunTimelineRequest } from "./handleRunTimelineRequest.js";

const unhandled = await handleRunTimelineRequest(createInput({ url: "/health" }));
assert.deepEqual(unhandled, { status: "unhandled" });

const methodResponse = createResponse();
const wrongMethod = await handleRunTimelineRequest(createInput({
  method: "POST",
  response: methodResponse,
}));
assert.deepEqual(wrongMethod, { status: "rejected", reason: "method-not-allowed" });
assert.equal(methodResponse.statusCode, 405);
assert.equal(methodResponse.headers.allow, "GET");

const invalidResumeResponse = createResponse();
const invalidResume = await handleRunTimelineRequest(createInput({
  headers: { "last-event-id": "1.5" },
  response: invalidResumeResponse,
}));
assert.equal(invalidResume.reason, "invalid-last-event-id");
assert.equal(invalidResumeResponse.statusCode, 400);

const unauthorizedResponse = createResponse();
const unauthorized = await handleRunTimelineRequest(createInput({
  response: unauthorizedResponse,
  authorizeRunAccess: async ({ runId }) => {
    assert.equal(runId, "run private");
    return false;
  },
  url: "/runs/run%20private/timeline",
}));
assert.equal(unauthorized.reason, "unauthorized");
assert.equal(unauthorizedResponse.statusCode, 401);

const streamingResponse = createResponse();
const closeHandlers = [];
let hasUnsubscribed = false;
const streaming = await handleRunTimelineRequest(createInput({
  headers: { "last-event-id": "7" },
  response: streamingResponse,
  requestOn: (name, handler) => closeHandlers.push({ name, handler }),
  store: { list: async () => [{
    eventId: "event-8",
    runId: "run-1",
    sequence: 8,
    type: "step.completed",
    occurredAt: "2026-08-14T10:00:08.000Z",
    payload: {},
  }] },
  stream: { subscribe: async () => async () => { hasUnsubscribed = true; } },
}));
assert.equal(streaming.status, "streaming");
assert.equal(streaming.runId, "run-1");
assert.equal(streamingResponse.statusCode, 200);
assert.match(streamingResponse.frames[0], /^id: 8/u);
assert.equal(closeHandlers[0].name, "close");
await closeHandlers[0].handler();
assert.equal(hasUnsubscribed, true);

/**
 * Creates one handler input fixture.
 *
 * @param {object} [overrides] Fixture overrides.
 * @returns {object} Handler input.
 */
function createInput(overrides = {}) {
  const response = overrides.response ?? createResponse();
  return {
    request: {
      method: overrides.method ?? "GET",
      url: overrides.url ?? "/runs/run-1/timeline",
      headers: overrides.headers ?? {},
      on: overrides.requestOn ?? (() => undefined),
    },
    response,
    authorizeRunAccess: overrides.authorizeRunAccess ?? (async () => true),
    store: overrides.store ?? { list: async () => [] },
    stream: overrides.stream ?? { subscribe: async () => async () => undefined },
    scheduleHeartbeat: () => () => undefined,
  };
}

/**
 * Creates a Node-compatible response test double.
 *
 * @returns {object} Response fixture.
 */
function createResponse() {
  return {
    frames: [],
    writeHead(statusCode, headers) { this.statusCode = statusCode; this.headers = headers; },
    write(frame) { this.frames.push(frame); },
    end(body) { this.body = body; },
  };
}
