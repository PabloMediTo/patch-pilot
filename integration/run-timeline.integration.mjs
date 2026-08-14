import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import process from "node:process";
import { clearTimeout, setTimeout } from "node:timers";

import {
  createPostgresRunTimelineStore,
  createRedisRunTimelineStream,
  listRunTimeline,
  recordRunTimelineEvent,
} from "@patch-pilot/maintenance";

const postgresUrl = process.env.PATCH_PILOT_POSTGRES_URL
  ?? "postgres://patch_pilot:patch_pilot@localhost:5432/patch_pilot";
const redisUrl = process.env.PATCH_PILOT_REDIS_URL ?? "redis://localhost:6379";
const runId = `timeline-integration-${randomUUID()}`;
const store = await createPostgresRunTimelineStore({ connectionString: postgresUrl });
const stream = await createRedisRunTimelineStream({ url: redisUrl });
const liveEvents = [];
let resolveLiveEvents;
let unsubscribe;

const receivedTwoEvents = new Promise((resolve) => { resolveLiveEvents = resolve; });
const timeout = setTimeout(() => resolveLiveEvents(), 5_000);

try {
  unsubscribe = await stream.subscribe(runId, (event) => {
    liveEvents.push(event);
    if (liveEvents.length === 2) resolveLiveEvents();
  });

  for (const [index, type] of ["run.submitted", "reproduction.completed"].entries()) {
    const result = await recordRunTimelineEvent({
      runId,
      type,
      payload: { integration: true, ordinal: index + 1 },
      store,
      stream,
      createId: randomUUID,
      clock: () => new Date(),
    });
    assert.equal(result.status, "persisted-and-streamed");
  }

  await receivedTwoEvents;
  clearTimeout(timeout);
  assert.equal(liveEvents.length, 2, "Redis must deliver both persisted events within five seconds.");

  const history = await listRunTimeline({ runId, store });
  assert.deepEqual(history.map(({ sequence }) => sequence), [1, 2]);
  assert.deepEqual(history.map(({ type }) => type), ["run.submitted", "reproduction.completed"]);
  assert.deepEqual(history.map(({ payload }) => payload.ordinal), [1, 2]);
  assert.deepEqual(liveEvents.map(({ eventId }) => eventId), history.map(({ eventId }) => eventId));
} finally {
  clearTimeout(timeout);
  await unsubscribe?.();
  await stream.close();
  await store.close();
}
