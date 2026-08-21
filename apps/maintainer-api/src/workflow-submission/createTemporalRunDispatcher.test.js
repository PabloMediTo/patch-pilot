import assert from "node:assert/strict";

import { WorkflowExecutionAlreadyStartedError } from "@temporalio/client";

import { createTemporalRunDispatcher } from "./index.js";

const run = Object.freeze({ id: "github:delivery-1", status: "submitted",
  submittedAt: "2026-08-16T15:00:00.000Z", repository: "octo/example" });
const starts = [];
const dispatchRun = createTemporalRunDispatcher({ taskQueue: "patch-pilot-maintenance",
  client: { workflow: { async start(workflowType, options) {
    starts.push({ workflowType, options });
    return { workflowId: options.workflowId };
  } } } });

assert.deepEqual(await dispatchRun(run), { status: "started",
  workflowId: run.id, runId: run.id });
assert.deepEqual(starts, [{ workflowType: "maintenanceRunWorkflow",
  options: { workflowId: run.id, taskQueue: "patch-pilot-maintenance", args: [run] } }]);

const replay = createTemporalRunDispatcher({ taskQueue: "patch-pilot-maintenance",
  client: { workflow: { async start() {
    throw new WorkflowExecutionAlreadyStartedError("already started", run.id,
      "maintenanceRunWorkflow");
  } } } });
assert.deepEqual(await replay(run), { status: "existing", workflowId: run.id, runId: run.id });

const providerFailure = new Error("Temporal unavailable");
const failing = createTemporalRunDispatcher({ taskQueue: "patch-pilot-maintenance",
  client: { workflow: { async start() { throw providerFailure; } } } });
await assert.rejects(failing(run), (error) => error === providerFailure);
await assert.rejects(failing({ id: run.id, status: "submitted" }), /persisted submitted run/u);
assert.throws(() => createTemporalRunDispatcher({}), /workflow client and task queue/u);
