import assert from "node:assert/strict";

import { createMaintenanceWorkflowActivities, orchestrateMaintenanceRun } from "./index.js";

const run = Object.freeze({ id: "github:delivery-1", repository: "octo/example",
  issueNumber: 42, baseRevision: "a".repeat(40), status: "submitted",
  submittedAt: "2026-08-16T16:00:00.000Z" });

const events = [];
const times = ["2026-08-16T16:01:00.000Z", "2026-08-16T16:02:00.000Z"];
const inspection = Object.freeze({ status: "supported", language: "typescript",
  command: Object.freeze({ executable: "npm", args: Object.freeze(["test"]) }) });
const result = await orchestrateMaintenanceRun({ run,
  recordTimelineEvent: async (event) => { events.push(event); },
  inspectRepository: async () => inspection,
  now: () => times.shift() });

assert.deepEqual(result, { status: "inspection-completed", runId: run.id, inspection });
assert.deepEqual(events.map(({ eventId, type, occurredAt }) => ({ eventId, type, occurredAt })), [
  { eventId: `${run.id}:timeline:submitted`, type: "run.submitted",
    occurredAt: run.submittedAt },
  { eventId: `${run.id}:timeline:inspection-started`, type: "run.inspection.started",
    occurredAt: "2026-08-16T16:01:00.000Z" },
  { eventId: `${run.id}:timeline:inspection-completed`, type: "run.inspection.completed",
    occurredAt: "2026-08-16T16:02:00.000Z" },
]);

const failure = new Error("checkout unavailable");
const failureEvents = [];
await assert.rejects(orchestrateMaintenanceRun({ run,
  recordTimelineEvent: async (event) => { failureEvents.push(event); },
  inspectRepository: async () => { throw failure; },
  now: () => "2026-08-16T16:03:00.000Z" }), (error) => error === failure);
assert.equal(failureEvents.at(-1).type, "run.inspection.failed");
assert.equal(failureEvents.at(-1).payload.message, "checkout unavailable");

const activityCalls = [];
const timelineEvents = [];
const activities = createMaintenanceWorkflowActivities({ workspaceRoot: "controlled-root",
  timelineStore: { append: async (event) => {
    timelineEvents.push(event);
    return Object.freeze({ ...event, sequence: 1 });
  } },
  timelineStream: { publish: async () => undefined },
  createWorkspace: async (input) => {
    activityCalls.push({ operation: "create", input });
    return { workspaceDirectory: "controlled-root/repository-1" };
  },
  detectProject: async (input) => {
    activityCalls.push({ operation: "detect", input });
    return { ...inspection, workspaceDirectory: input.workspaceDirectory };
  },
  removeWorkspace: async (input) => { activityCalls.push({ operation: "remove", input }); },
});
assert.deepEqual(await activities.inspectRepository(run), inspection);
assert.deepEqual(activityCalls.map(({ operation }) => operation), ["create", "detect", "remove"]);
assert.equal(activityCalls[0].input.repositoryUrl, "https://github.com/octo/example.git");

await activities.recordTimelineEvent({ eventId: "event-1", runId: run.id,
  type: "run.submitted", occurredAt: run.submittedAt, payload: { status: "submitted" } });
assert.equal(timelineEvents[0].eventId, "event-1");
assert.throws(() => createMaintenanceWorkflowActivities({}), /timeline and workspace/u);
