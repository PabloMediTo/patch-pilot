/**
 * Creates the initial durable state for a validated maintenance run.
 *
 * @param {{ id: string, installationId?: number, repository: string, issueNumber: number, defaultBranch?: string, baseRevision: string, actorId?: number, sourceDeliveryId?: string }} input Run identity, authorization context, and immutable target.
 * @returns {{ id: string, installationId?: number, repository: string, issueNumber: number, defaultBranch?: string, baseRevision: string, actorId?: number, sourceDeliveryId?: string, status: string }} The initial run state.
 */
export function createMaintenanceRun(input) {
  assertRunInput(input);
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

/** Rejects malformed or mutable GitHub target identities before persistence. */
function assertRunInput(input) {
  const hasStrings = [input?.id, input?.repository, input?.baseRevision]
    .every((value) => typeof value === "string" && value.trim() !== "");
  const hasRepository = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(input?.repository);
  const hasRevision = /^[0-9a-f]{40}$/u.test(input?.baseRevision);
  const hasIssue = Number.isInteger(input?.issueNumber) && input.issueNumber > 0;
  const hasOptionalNumbers = [input?.installationId, input?.actorId]
    .every((value) => value === undefined || (Number.isInteger(value) && value > 0));
  const hasOptionalStrings = [input?.defaultBranch, input?.sourceDeliveryId]
    .every((value) => value === undefined || (typeof value === "string" && value.trim() !== ""));
  if (!hasStrings || !hasRepository || !hasRevision || !hasIssue
    || !hasOptionalNumbers || !hasOptionalStrings) {
    throw new Error("Maintenance run requires valid identity and immutable target evidence.");
  }
}
