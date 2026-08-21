import { randomUUID } from "node:crypto";
import process from "node:process";
import { clearTimeout, setTimeout } from "node:timers";

import {
  createPostgresRunTimelineStore,
  createRedisRunTimelineStream,
  listRunTimeline,
  recordRunTimelineEvent,
} from "@patch-pilot/maintenance";

import { verifyTimelineIntegrationEvidence } from "./timeline-integration.mjs";

const postgresUrl = process.env.PATCH_PILOT_POSTGRES_URL
  ?? "postgres://patch_pilot:patch_pilot@localhost:5432/patch_pilot";
const redisUrl = process.env.PATCH_PILOT_REDIS_URL ?? "redis://localhost:6379";
const runId = `timeline-integration-${randomUUID()}`;
const store = await createPostgresRunTimelineStore({ connectionString: postgresUrl });
const stream = await createRedisRunTimelineStream({ url: redisUrl });
const liveEvents = [];
const recordResults = [];
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
    recordResults.push(await recordRunTimelineEvent({
      runId,
      type,
      payload: { integration: true, ordinal: index + 1 },
      store,
      stream,
      createId: randomUUID,
      clock: () => new Date(),
    }));
  }

  await receivedTwoEvents;
  clearTimeout(timeout);
  const history = await listRunTimeline({ runId, store });
  const report = verifyTimelineIntegrationEvidence({ recordResults, liveEvents, history });
  process.stdout.write(`${JSON.stringify(report)}\n`);
} finally {
  clearTimeout(timeout);
  await unsubscribe?.();
  await stream.close();
  await store.close();
}
