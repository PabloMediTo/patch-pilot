import { createImmutableRepositoryWorkspace, detectSupportedProject,
  recordRunTimelineEvent, removeRepositoryWorkspace } from "@patch-pilot/maintenance";

const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;

/**
 * Creates concrete timeline and disposable repository-inspection Activities.
 *
 * @param {{ timelineStore: object, timelineStream: object, workspaceRoot: string, createWorkspace?: Function, detectProject?: Function, removeWorkspace?: Function }} input Provider resources and optional controlled operations.
 * @returns {{ recordTimelineEvent: Function, inspectRepository: Function }} Temporal Activities.
 */
export function createMaintenanceWorkflowActivities(input) {
  assertPorts(input);
  const createWorkspace = input.createWorkspace ?? createImmutableRepositoryWorkspace;
  const detectProject = input.detectProject ?? detectSupportedProject;
  const removeWorkspace = input.removeWorkspace ?? removeRepositoryWorkspace;
  return Object.freeze({
    recordTimelineEvent: (event) => recordRunTimelineEvent({ runId: event.runId,
      type: event.type, payload: event.payload, store: input.timelineStore,
      stream: input.timelineStream, createId: () => event.eventId,
      clock: () => new Date(event.occurredAt) }),
    inspectRepository: (run) => inspectRepository({ run, workspaceRoot: input.workspaceRoot,
      createWorkspace, detectProject, removeWorkspace }),
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
  if (!REPOSITORY.test(run?.repository) || !/^[0-9a-f]{40}$/u.test(run?.baseRevision)) {
    throw new Error("Repository inspection requires a valid repository and base revision.");
  }
}
