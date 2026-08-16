import assert from "node:assert/strict";

import { createMaintenanceWorkflowActivities, orchestrateMaintenanceRun } from "./index.js";

const run = Object.freeze({ id: "github:delivery-1", repository: "octo/example",
  issueNumber: 42, baseRevision: "a".repeat(40), status: "submitted",
  issueTitle: "Fix incorrect addition result",
  issueContext: "Addition returns the wrong value.",
  expectedFailure: "expected 2 but received 3",
  submittedAt: "2026-08-16T16:00:00.000Z" });

const events = [];
const times = ["2026-08-16T16:01:00.000Z", "2026-08-16T16:02:00.000Z",
  "2026-08-16T16:03:00.000Z", "2026-08-16T16:04:00.000Z",
  "2026-08-16T16:05:00.000Z", "2026-08-16T16:06:00.000Z",
  "2026-08-16T16:07:00.000Z", "2026-08-16T16:08:00.000Z",
  "2026-08-16T16:09:00.000Z", "2026-08-16T16:10:00.000Z"];
const inspection = Object.freeze({ status: "supported", language: "typescript",
  command: Object.freeze({ executable: "npm", args: Object.freeze(["test"]) }) });
const readyProposal = Object.freeze({ status: "ready",
  plan: Object.freeze({ version: 1, summary: "Correct addition.", steps: Object.freeze([{
    sequence: 1, description: "Fix math.", rationale: "It owns the failure.",
    files: Object.freeze(["src/math.ts"]),
  }]) }), sourceDiff: Object.freeze({ unifiedDiff: "secret source diff",
    changes: Object.freeze([{ path: "src/math.ts", addedLines: 1, deletedLines: 1 }]) }),
  safety: Object.freeze({ status: "allowed", reasons: Object.freeze([]) }) });
const result = await orchestrateMaintenanceRun({ run,
  recordTimelineEvent: async (event) => { events.push(event); },
  inspectRepository: async () => inspection,
  reproduceIssue: async () => ({ status: "reproduced", evidence: { exitCode: 1 } }),
  collectPlanningContext: async () => ({ status: "ready",
    relevantFiles: [{ path: "src/math.ts", content: "export const add = () => 3;",
      byteLength: 27 }], totalBytes: 27, candidateCount: 4 }),
  createProposal: async () => readyProposal,
  now: () => times.shift() });

assert.equal(result.status, "proposal-ready");
assert.equal(result.reproduction.status, "reproduced");
assert.equal(result.repositoryContext.relevantFiles[0].path, "src/math.ts");
assert.equal(events[6].payload.repositoryContext.relevantFiles[0].content, undefined);
assert.equal(events.at(-1).payload.unifiedDiff, undefined);
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
  { eventId: `${run.id}:timeline:planning-context-started`,
    type: "run.planning.context.started", occurredAt: "2026-08-16T16:05:00.000Z" },
  { eventId: `${run.id}:timeline:planning-context-completed`,
    type: "run.planning.context.completed", occurredAt: "2026-08-16T16:06:00.000Z" },
  { eventId: `${run.id}:timeline:planning-ready`, type: "run.planning.ready",
    occurredAt: "2026-08-16T16:07:00.000Z" },
  { eventId: `${run.id}:timeline:proposal-started`, type: "run.proposal.started",
    occurredAt: "2026-08-16T16:08:00.000Z" },
  { eventId: `${run.id}:timeline:proposal-completed`, type: "run.proposal.completed",
    occurredAt: "2026-08-16T16:09:00.000Z" },
  { eventId: `${run.id}:timeline:proposal-ready`, type: "run.proposal.ready",
    occurredAt: "2026-08-16T16:10:00.000Z" },
]);

const blockedEvents = [];
const blocked = await orchestrateMaintenanceRun({ run,
  recordTimelineEvent: async (event) => { blockedEvents.push(event); },
  inspectRepository: async () => inspection,
  reproduceIssue: async () => ({ status: "reproduced", evidence: { exitCode: 1 } }),
  collectPlanningContext: async () => ({ status: "ready", relevantFiles: [{
    path: "src/math.ts", content: "source", byteLength: 6 }], totalBytes: 6,
  candidateCount: 1 }), createProposal: async () => ({ ...readyProposal, status: "blocked",
    safety: { status: "blocked", reasons: ["forbidden-path"] } }),
  now: () => "2026-08-16T16:11:00.000Z" });
assert.equal(blocked.status, "proposal-blocked");
assert.equal(blockedEvents.at(-1).payload.outcome, "proposal-blocked");

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

const unavailableEvents = [];
const unavailable = await orchestrateMaintenanceRun({ run,
  recordTimelineEvent: async (event) => { unavailableEvents.push(event); },
  inspectRepository: async () => inspection,
  reproduceIssue: async () => ({ status: "reproduced", evidence: { exitCode: 1 } }),
  collectPlanningContext: async () => ({ status: "unsupported",
    reason: "no-readable-planning-context" }),
  now: () => "2026-08-16T16:08:00.000Z" });
assert.equal(unavailable.status, "planning-context-unavailable");
assert.equal(unavailableEvents.at(-1).type, "run.terminal");
assert.equal(unavailableEvents.at(-1).payload.reason, "no-readable-planning-context");

const malformedContextEvents = [];
await assert.rejects(orchestrateMaintenanceRun({ run,
  recordTimelineEvent: async (event) => { malformedContextEvents.push(event); },
  inspectRepository: async () => inspection,
  reproduceIssue: async () => ({ status: "reproduced", evidence: { exitCode: 1 } }),
  collectPlanningContext: async () => ({ status: "ready", relevantFiles: [], totalBytes: 0,
    candidateCount: 0 }),
  now: () => "2026-08-16T16:09:00.000Z" }), /invalid outcome/u);
assert.equal(malformedContextEvents.at(-1).type, "run.planning.context.failed");

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
  collectPlanningContext: async (input) => {
    activityCalls.push({ operation: "collect", input });
    return { status: "ready", relevantFiles: [{ path: "src/math.ts", content: "source",
      byteLength: 6 }], totalBytes: 6, candidateCount: 3 };
  },
  generatePlan: async (input) => {
    activityCalls.push({ operation: "plan", input });
    return { summary: "Correct addition.", steps: [{ description: "Fix math.",
      rationale: "It owns the failure.", files: ["src/math.ts"] }] };
  },
  generateDiff: async (input) => {
    activityCalls.push({ operation: "diff", input });
    return { unifiedDiff: ["diff --git a/src/math.ts b/src/math.ts", "@@ -1 +1 @@",
      "-export const add = () => 3;", "+export const add = () => 2;"].join("\n") };
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

const repositoryContext = await activities.collectPlanningContext(run);
assert.equal(repositoryContext.status, "ready");
assert.deepEqual(activityCalls.map(({ operation }) => operation),
  ["create", "detect", "remove", "create", "detect", "remove",
    "create", "collect", "remove"]);
assert.deepEqual(activityCalls.at(-2).input.issue,
  { title: run.issueTitle, context: run.issueContext });

const proposal = await activities.createProposal({ run, reproduction, repositoryContext });
assert.equal(proposal.status, "ready");
assert.deepEqual(activityCalls.slice(-2).map(({ operation }) => operation), ["plan", "diff"]);
assert.equal(activityCalls.at(-2).input.issue.context, run.issueContext);

await activities.recordTimelineEvent({ eventId: "event-1", runId: run.id,
  type: "run.submitted", occurredAt: run.submittedAt, payload: { status: "submitted" } });
assert.equal(timelineEvents[0].eventId, "event-1");
assert.throws(() => createMaintenanceWorkflowActivities({}), /timeline, workspace, and generator/u);
