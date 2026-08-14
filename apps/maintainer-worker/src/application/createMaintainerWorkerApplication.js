/**
 * Creates the maintenance worker application identity used by its composition root.
 *
 * @returns {{ name: string, responsibility: string }} The immutable application identity.
 */
export function createMaintainerWorkerApplication() {
  return Object.freeze({
    name: "maintainer-worker",
    responsibility: "maintenance-worker",
  });
}
