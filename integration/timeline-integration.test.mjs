import assert from "node:assert/strict";

import { verifyTimelineIntegrationEvidence } from "./timeline-integration.mjs";

const evidence = createEvidence();
const report = verifyTimelineIntegrationEvidence(evidence);

assert.equal(report.status, "passed");
assert.deepEqual(report.checks.map(({ name }) => name), [
  "postgres-persistence", "postgres-ordering", "redis-delivery", "provider-identity-match",
]);
assert.equal(JSON.stringify(report).includes("event-1"), false);

assert.throws(() => verifyTimelineIntegrationEvidence(createEvidence({
  recordResults: [{ status: "persisted-and-streamed" }, { status: "persisted-stream-failed" }],
})), /did not persist and stream every event/u);

assert.throws(() => verifyTimelineIntegrationEvidence(createEvidence({
  history: createEvents().reverse(),
})), /Postgres history does not contain the canonical timeline evidence/u);

assert.throws(() => verifyTimelineIntegrationEvidence(createEvidence({
  liveEvents: createEvents({ secondEventId: "different-event" }),
})), /provider event identities do not match/u);

assert.throws(() => verifyTimelineIntegrationEvidence(createEvidence({ liveEvents: [] })),
  /requires two persisted and two delivered events/u);

/** Creates one complete provider-free evidence set. */
function createEvidence(overrides = {}) {
  return { recordResults: [{ status: "persisted-and-streamed" },
    { status: "persisted-and-streamed" }], liveEvents: createEvents(),
  history: createEvents(), ...overrides };
}

/** Creates the canonical two timeline events. */
function createEvents({ secondEventId = "event-2" } = {}) {
  return [
    { eventId: "event-1", sequence: 1, type: "run.submitted",
      payload: { integration: true, ordinal: 1 } },
    { eventId: secondEventId, sequence: 2, type: "reproduction.completed",
      payload: { integration: true, ordinal: 2 } },
  ];
}
