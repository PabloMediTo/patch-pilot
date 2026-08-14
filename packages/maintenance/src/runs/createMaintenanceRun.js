/**
 * Creates the initial durable state for a validated maintenance run.
 *
 * @param {{ id: string, repository: string, issueNumber: number, baseRevision: string }} input Run identity and immutable target.
 * @returns {{ id: string, repository: string, issueNumber: number, baseRevision: string, status: string }} The initial run state.
 */
export function createMaintenanceRun(input) {
  return Object.freeze({
    id: input.id,
    repository: input.repository,
    issueNumber: input.issueNumber,
    baseRevision: input.baseRevision,
    status: "submitted",
  });
}
