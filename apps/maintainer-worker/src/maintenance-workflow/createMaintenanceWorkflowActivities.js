import { createImmutableRepositoryWorkspace, detectSupportedProject,
  recordRunTimelineEvent, removeRepositoryWorkspace,
  reproduceIssueFailure } from "@patch-pilot/maintenance";

import { createSandboxCommandExecutor } from "../sandbox-execution/index.js";

const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;

/**
 * Creates concrete timeline, inspection, and isolated reproduction Activities.
 *
 * @param {{ timelineStore: object, timelineStream: object, workspaceRoot: string, createWorkspace?: Function, detectProject?: Function, removeWorkspace?: Function, executeCommand?: Function }} input Provider resources and optional controlled operations.
 * @returns {{ recordTimelineEvent: Function, inspectRepository: Function, reproduceIssue: Function }} Temporal Activities.
 */
export function createMaintenanceWorkflowActivities(input) {
  assertPorts(input);
  const createWorkspace = input.createWorkspace ?? createImmutableRepositoryWorkspace;
  const detectProject = input.detectProject ?? detectSupportedProject;
  const removeWorkspace = input.removeWorkspace ?? removeRepositoryWorkspace;
  const executeCommand = input.executeCommand ?? createSandboxCommandExecutor();
  return Object.freeze({
    recordTimelineEvent: (event) => recordRunTimelineEvent({ runId: event.runId,
      type: event.type, payload: event.payload, store: input.timelineStore,
      stream: input.timelineStream, createId: () => event.eventId,
      clock: () => new Date(event.occurredAt) }),
    inspectRepository: (run) => inspectRepository({ run, workspaceRoot: input.workspaceRoot,
      createWorkspace, detectProject, removeWorkspace }),
    reproduceIssue: (run) => reproduceIssue({ run, workspaceRoot: input.workspaceRoot,
      createWorkspace, detectProject, removeWorkspace, executeCommand }),
  });
}

/** Creates, detects, sanitizes, and always removes one inspection checkout. */
async function inspectRepository(input) {
  assertRunTarget(input.run);
  const workspace = await input.createWorkspace({ rootDirectory: input.workspaceRoot,
    repositoryUrl: `https://github.com/${input.run.repository}.git`,
    baseRevision: input.run.baseRevision });
  try {
    return sanitizeInspection(await input.detectProject({
      workspaceDirectory: workspace.workspaceDirectory }));
  } finally {
    await input.removeWorkspace({ rootDirectory: input.workspaceRoot,
      workspaceDirectory: workspace.workspaceDirectory });
  }
}

/** Recreates the target and executes its standard test command in the sandbox. */
async function reproduceIssue(input) {
  assertRunTarget(input.run);
  const workspace = await createWorkspace(input);
  try {
    const project = await input.detectProject({ workspaceDirectory: workspace.workspaceDirectory });
    return reproduceIssueFailure({ project, expectedFailure: input.run.expectedFailure,
      executeCommand: input.executeCommand });
  } finally {
    await removeWorkspace(input, workspace.workspaceDirectory);
  }
}

/** Creates one exact-revision credential-free checkout for an Activity. */
function createWorkspace(input) {
  return input.createWorkspace({ rootDirectory: input.workspaceRoot,
    repositoryUrl: `https://github.com/${input.run.repository}.git`,
    baseRevision: input.run.baseRevision });
}

/** Removes one generated Activity workspace through the canonical guard. */
function removeWorkspace(input, workspaceDirectory) {
  return input.removeWorkspace({ rootDirectory: input.workspaceRoot, workspaceDirectory });
}

/** Removes ephemeral filesystem identity from durable inspection evidence. */
function sanitizeInspection(project) {
  if (project?.status !== "supported") {
    return Object.freeze({ status: "unsupported", reason: project?.reason ?? "invalid-result" });
  }
  return Object.freeze({ status: "supported", language: project.language,
    command: Object.freeze({ executable: project.command.executable,
      args: Object.freeze([...project.command.args]) }) });
}

/** Requires concrete timeline resources and a dedicated workspace root. */
function assertPorts(input) {
  if (typeof input?.timelineStore?.append !== "function"
    || typeof input?.timelineStream?.publish !== "function"
    || typeof input.workspaceRoot !== "string" || input.workspaceRoot.trim() === "") {
    throw new Error("Maintenance workflow Activities require timeline and workspace resources.");
  }
}

/** Validates one immutable GitHub repository target before checkout. */
function assertRunTarget(run) {
  if (!REPOSITORY.test(run?.repository) || !/^[0-9a-f]{40}$/u.test(run?.baseRevision)
    || typeof run.expectedFailure !== "string" || run.expectedFailure.trim() === ""
    || run.expectedFailure.length > 500) {
    throw new Error("Repository inspection requires a valid repository and base revision.");
  }
}
