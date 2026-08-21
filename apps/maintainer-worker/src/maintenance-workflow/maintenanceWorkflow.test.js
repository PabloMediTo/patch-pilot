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
  "2026-08-16T16:09:00.000Z", "2026-08-16T16:10:00.000Z",
  "2026-08-16T16:11:00.000Z", "2026-08-16T16:12:00.000Z",
  "2026-08-16T16:13:00.000Z", "2026-08-16T16:14:00.000Z",
  "2026-08-16T16:15:00.000Z", "2026-08-16T16:16:00.000Z",
  "2026-08-16T16:17:00.000Z", "2026-08-16T16:18:00.000Z"];
const inspection = Object.freeze({ status: "supported", language: "typescript",
  command: Object.freeze({ executable: "npm", args: Object.freeze(["test"]) }) });
const readyProposal = Object.freeze({ status: "ready",
  plan: Object.freeze({ version: 1, summary: "Correct addition.", steps: Object.freeze([{
    sequence: 1, description: "Fix math.", rationale: "It owns the failure.",
    files: Object.freeze(["src/math.ts"]),
  }]) }), sourceDiff: Object.freeze({ unifiedDiff: "secret source diff",
    changes: Object.freeze([{ path: "src/math.ts", addedLines: 1, deletedLines: 1 }]) }),
  safety: Object.freeze({ status: "allowed", reasons: Object.freeze([]) }) });
const acceptedAttempt = Object.freeze({ attemptNumber: 1, proposal: readyProposal,
  verification: Object.freeze({ status: "passed", evidence: Object.freeze({
    command: Object.freeze({ executable: "npm", args: Object.freeze(["test"]) }),
    exitCode: 0, stdout: "passed", stderr: "", durationMs: 50,
    hasTimedOut: false, hasTruncatedOutput: false,
  }) }),
  critique: Object.freeze({ decision: "accepted", rationale: "Verified.",
    findings: Object.freeze([]) }) });
const reviewBinding = Object.freeze({ baseRevision: run.baseRevision,
  diffHash: "b".repeat(64), planVersion: 1,
  verification: Object.freeze({ status: "passed", evidenceHash: "c".repeat(64) }) });
const approvalDecision = Object.freeze({ runId: run.id, actorId: "operator:pablo",
  idempotencyKey: "approval-1", status: "approved", reason: null,
  decidedAt: "2026-08-16T16:17:30.000Z", reviewBinding });
const successfulInput = { run,
  recordTimelineEvent: async (event) => { events.push(event); },
  inspectRepository: async () => inspection,
  reproduceIssue: async () => ({ status: "reproduced", evidence: { exitCode: 1 } }),
  collectPlanningContext: async () => ({ status: "ready",
    relevantFiles: [{ path: "src/math.ts", content: "export const add = () => 3;",
      byteLength: 27 }], totalBytes: 27, candidateCount: 4 }),
  createProposal: async () => readyProposal,
  executeProposalAttempts: async () => ({ status: "completed",
    attempts: [acceptedAttempt], proposal: readyProposal }),
  recordReviewSnapshot: async (request) => Object.freeze({ status: "created",
    snapshot: Object.freeze({ run: Object.freeze({ ...run, status: "awaiting-approval" }),
      reviewBinding, recordedAt: request.recordedAt }) }),
  waitForApproval: async (binding) => {
    assert.deepEqual(binding, reviewBinding);
    return approvalDecision;
  },
  now: () => times.shift() };
const result = await orchestrateMaintenanceRun(successfulInput);

assert.equal(result.status, "approved");
assert.deepEqual(result.review.reviewBinding, reviewBinding);
assert.deepEqual(result.approval, approvalDecision);
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
  { eventId: `${run.id}:timeline:attempts-started`, type: "run.attempts.started",
    occurredAt: "2026-08-16T16:11:00.000Z" },
  { eventId: `${run.id}:timeline:attempts-completed`, type: "run.attempts.completed",
    occurredAt: "2026-08-16T16:12:00.000Z" },
  { eventId: `${run.id}:timeline:attempts-accepted`, type: "run.attempts.accepted",
    occurredAt: "2026-08-16T16:13:00.000Z" },
  { eventId: `${run.id}:timeline:review-started`, type: "run.review.started",
    occurredAt: "2026-08-16T16:14:00.000Z" },
  { eventId: `${run.id}:timeline:review-ready`, type: "run.review.ready",
    occurredAt: "2026-08-16T16:16:00.000Z" },
  { eventId: `${run.id}:timeline:approval-waiting`, type: "run.approval.waiting",
    occurredAt: "2026-08-16T16:17:00.000Z" },
  { eventId: `${run.id}:timeline:approval-approved`, type: "run.approval.approved",
    occurredAt: "2026-08-16T16:18:00.000Z" },
]);
assert.equal(events.at(-3).payload.recordedAt, "2026-08-16T16:15:00.000Z");
assert.equal(events.at(-2).payload.reviewBinding.diffHash, "b".repeat(64));
assert.equal(events.at(-1).payload.idempotencyKey, undefined);

const rejectionEvents = [];
const rejectedApproval = await orchestrateMaintenanceRun({ ...successfulInput,
  recordTimelineEvent: async (event) => { rejectionEvents.push(event); },
  waitForApproval: async () => ({ ...approvalDecision, status: "rejected",
    reason: "Needs a narrower fix" }),
  now: () => "2026-08-16T17:00:00.000Z" });
assert.equal(rejectedApproval.status, "approval-rejected");
assert.equal(rejectionEvents.at(-2).type, "run.approval.rejected");
assert.equal(rejectionEvents.at(-1).type, "run.terminal");
assert.equal(rejectionEvents.at(-1).payload.outcome, "approval-rejected");

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
let executionCalls = 0;
const activities = createMaintenanceWorkflowActivities({ workspaceRoot: "controlled-root",
  timelineStore: { append: async (event) => {
    timelineEvents.push(event);
    return Object.freeze({ ...event, sequence: 1 });
  } },
  timelineStream: { publish: async () => undefined },
  reviewStore: { saveSnapshot: async (snapshot) => {
    activityCalls.push({ operation: "save-review", input: snapshot });
    return { status: "created", snapshot };
  } },
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
  reviewProposal: async (input) => {
    activityCalls.push({ operation: "review", input });
    return { decision: "accepted", rationale: "Focused and verified.", findings: [] };
  },
  materializeDiff: async (input) => {
    activityCalls.push({ operation: "materialize", input });
    return { status: "materialized" };
  },
  removeWorkspace: async (input) => { activityCalls.push({ operation: "remove", input }); },
  executeCommand: async () => {
    const call = executionCalls;
    executionCalls += 1;
    return { exitCode: call < 2 ? 1 : 0, stdout: call > 1 ? "passed" : "",
      stderr: call > 1 ? "" : "expected 2 but received 3", durationMs: 50,
      hasTimedOut: false, hasTruncatedOutput: false };
  },
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

const attempts = await activities.executeProposalAttempts({ run, inspection, reproduction,
  repositoryContext, proposal });
assert.equal(attempts.status, "completed");
assert.equal(attempts.attempts.length, 2);
assert.deepEqual(activityCalls.slice(-8).map(({ operation }) => operation),
  ["create", "detect", "materialize", "plan", "diff", "materialize", "review", "remove"]);
assert.equal(activityCalls.at(-5).input.revisionEvidence.verification.status, "failed");
assert.equal(activityCalls.at(-3).input.baseRevision, run.baseRevision);

const review = await activities.recordReviewSnapshot({ run, proposal: attempts.proposal,
  verification: attempts.attempts.at(-1).verification,
  critique: attempts.attempts.at(-1).critique,
  recordedAt: "2026-08-16T16:15:00.000Z" });
assert.equal(review.status, "created");
assert.equal(review.snapshot.run.status, "awaiting-approval");
assert.equal(activityCalls.at(-1).operation, "save-review");
assert.equal(activityCalls.at(-1).input.proposal.diff,
  attempts.proposal.sourceDiff.unifiedDiff);

await activities.recordTimelineEvent({ eventId: "event-1", runId: run.id,
  type: "run.submitted", occurredAt: run.submittedAt, payload: { status: "submitted" } });
assert.equal(timelineEvents[0].eventId, "event-1");
assert.throws(() => createMaintenanceWorkflowActivities({}),
  /timeline, review, workspace, and generator/u);
