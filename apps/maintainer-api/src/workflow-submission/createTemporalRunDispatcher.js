import { WorkflowExecutionAlreadyStartedError } from "@temporalio/client";

const WORKFLOW_TYPE = "maintenanceRunWorkflow";

/**
 * Creates idempotent Temporal submission for already persisted maintenance runs.
 *
 * @param {{ client: object, taskQueue: string }} input Temporal client and worker queue.
 * @returns {Function} Run-dispatch operation.
 */
export function createTemporalRunDispatcher(input) {
  assertPort(input);
  return async function dispatchRun(run) {
    assertRun(run);
    try {
      const handle = await input.client.workflow.start(WORKFLOW_TYPE, {
        workflowId: run.id,
        taskQueue: input.taskQueue,
        args: [run],
      });
      return Object.freeze({ status: "started", workflowId: handle.workflowId, runId: run.id });
    } catch (error) {
      if (error instanceof WorkflowExecutionAlreadyStartedError) {
        return Object.freeze({ status: "existing", workflowId: run.id, runId: run.id });
      }
      throw error;
    }
  };
}

/** Requires one Temporal workflow client and a concrete worker queue. */
function assertPort(input) {
  if (typeof input?.client?.workflow?.start !== "function"
    || typeof input.taskQueue !== "string" || input.taskQueue.trim() === "") {
    throw new Error("Temporal run dispatcher requires a workflow client and task queue.");
  }
}

/** Requires the canonical persisted run identity before workflow dispatch. */
function assertRun(run) {
  if (typeof run?.id !== "string" || run.id.trim() === "" || run.status !== "submitted"
    || typeof run.submittedAt !== "string" || run.submittedAt.trim() === "") {
    throw new Error("Temporal dispatch requires one persisted submitted run.");
  }
}
