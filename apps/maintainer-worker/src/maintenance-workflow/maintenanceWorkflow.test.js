import assert from "node:assert/strict";

import { createMaintenanceWorkflowActivities, orchestrateMaintenanceRun } from "./index.js";

const run = Object.freeze({ id: "github:delivery-1", repository: "octo/example",
  issueNumber: 42, baseRevision: "a".repeat(40), status: "submitted",
  expectedFailure: "expected 2 but received 3",
  submittedAt: "2026-08-16T16:00:00.000Z" });

const events = [];
const times = ["2026-08-16T16:01:00.000Z", "2026-08-16T16:02:00.000Z",
  "2026-08-16T16:03:00.000Z", "2026-08-16T16:04:00.000Z",
  "2026-08-16T16:05:00.000Z"];
const inspection = Object.freeze({ status: "supported", language: "typescript",
  command: Object.freeze({ executable: "npm", args: Object.freeze(["test"]) }) });
const result = await orchestrateMaintenanceRun({ run,
  recordTimelineEvent: async (event) => { events.push(event); },
  inspectRepository: async () => inspection,
  reproduceIssue: async () => ({ status: "reproduced", evidence: { exitCode: 1 } }),
  now: () => times.shift() });

assert.equal(result.status, "reproduced");
assert.equal(result.reproduction.status, "reproduced");
assert.deepEqual(events.map(({ eventId, type, occurredAt }) => ({ eventId, type, occurredAt })), [
  { eventId: `${run.id}:timeline:submitted`, type: "run.submitted",
    occurredAt: run.submittedAt },
  { eventId: `${run.id}:timeline:inspection-started`, type: "run.inspection.started",
    occurredAt: "2026-08-16T16:01:00.000Z" },
  { eventId: `${run.id}:timeline:inspection-completed`, type: "run.inspection.completed",
    occurredAt: "2026-08-16T16:02:00.000Z" },
  { eventId: `${run.id}:timeline:reproduction-started`, type: "run.reproduction.started",
    occurredAt: "2026-08-16T16:03:00.000Z" },
  { eventId: `${run.id}:timeline:reproduction-completed`, type: "run.reproduction.completed",
    occurredAt: "2026-08-16T16:04:00.000Z" },
  { eventId: `${run.id}:timeline:planning-ready`, type: "run.planning.ready",
    occurredAt: "2026-08-16T16:05:00.000Z" },
]);

const failure = new Error("checkout unavailable");
const failureEvents = [];
await assert.rejects(orchestrateMaintenanceRun({ run,
  recordTimelineEvent: async (event) => { failureEvents.push(event); },
  inspectRepository: async () => { throw failure; },
  reproduceIssue: async () => { throw new Error("must not reproduce"); },
  now: () => "2026-08-16T16:03:00.000Z" }), (error) => error === failure);
assert.equal(failureEvents.at(-1).type, "run.inspection.failed");
assert.equal(failureEvents.at(-1).payload.message, "checkout unavailable");

const unsupportedEvents = [];
const unsupported = await orchestrateMaintenanceRun({ run,
  recordTimelineEvent: async (event) => { unsupportedEvents.push(event); },
  inspectRepository: async () => ({ status: "unsupported", reason: "no-supported-project" }),
  reproduceIssue: async () => { throw new Error("must not reproduce"); },
  now: () => "2026-08-16T16:05:00.000Z" });
assert.equal(unsupported.status, "unsupported");
assert.equal(unsupportedEvents.at(-2).type, "run.reproduction.skipped");
assert.equal(unsupportedEvents.at(-1).type, "run.terminal");
assert.equal(unsupportedEvents.at(-1).payload.outcome, "unsupported");

for (const terminalStatus of ["not-reproduced", "different-failure", "execution-failed"]) {
  const terminalEvents = [];
  const terminalResult = await orchestrateMaintenanceRun({ run,
    recordTimelineEvent: async (event) => { terminalEvents.push(event); },
    inspectRepository: async () => inspection,
    reproduceIssue: async () => ({ status: terminalStatus, reason: "controlled-outcome" }),
    now: () => "2026-08-16T16:06:00.000Z" });
  assert.equal(terminalResult.status, terminalStatus);
  assert.equal(terminalEvents.at(-1).type, "run.terminal");
  assert.deepEqual(terminalEvents.at(-1).payload,
    { outcome: terminalStatus, reason: "controlled-outcome" });
}

const invalidEvents = [];
await assert.rejects(orchestrateMaintenanceRun({ run,
  recordTimelineEvent: async (event) => { invalidEvents.push(event); },
  inspectRepository: async () => inspection,
  reproduceIssue: async () => ({ status: "unknown" }),
  now: () => "2026-08-16T16:07:00.000Z" }), /invalid outcome/u);
assert.equal(invalidEvents.at(-1).type, "run.reproduction.failed");

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
  executeCommand: async () => ({ exitCode: 1, stdout: "",
    stderr: "expected 2 but received 3", durationMs: 50,
    hasTimedOut: false, hasTruncatedOutput: false }),
});
assert.deepEqual(await activities.inspectRepository(run), inspection);
assert.deepEqual(activityCalls.map(({ operation }) => operation), ["create", "detect", "remove"]);
assert.equal(activityCalls[0].input.repositoryUrl, "https://github.com/octo/example.git");

const reproduction = await activities.reproduceIssue(run);
assert.equal(reproduction.status, "reproduced");
assert.deepEqual(activityCalls.map(({ operation }) => operation),
  ["create", "detect", "remove", "create", "detect", "remove"]);

await activities.recordTimelineEvent({ eventId: "event-1", runId: run.id,
  type: "run.submitted", occurredAt: run.submittedAt, payload: { status: "submitted" } });
assert.equal(timelineEvents[0].eventId, "event-1");
assert.throws(() => createMaintenanceWorkflowActivities({}), /timeline and workspace/u);
