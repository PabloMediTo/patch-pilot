/**
 * Creates the initial durable state for a validated maintenance run.
 *
 * @param {{ id: string, installationId?: number, repository: string, issueNumber: number, defaultBranch?: string, baseRevision: string, actorId?: number, sourceDeliveryId?: string }} input Run identity, authorization context, and immutable target.
 * @returns {{ id: string, installationId?: number, repository: string, issueNumber: number, defaultBranch?: string, baseRevision: string, actorId?: number, sourceDeliveryId?: string, status: string }} The initial run state.
 */
export function createMaintenanceRun(input) {
  return Object.freeze({
    id: input.id,
    installationId: input.installationId,
    repository: input.repository,
    issueNumber: input.issueNumber,
    ...(input.defaultBranch === undefined ? {} : { defaultBranch: input.defaultBranch }),
    baseRevision: input.baseRevision,
    actorId: input.actorId,
    sourceDeliveryId: input.sourceDeliveryId,
    status: "submitted",
  });
}
