/**
 * Creates the control-plane API application identity used by its composition root.
 *
 * @returns {{ name: string, responsibility: string }} The immutable application identity.
 */
export function createMaintainerApiApplication() {
  return Object.freeze({
    name: "maintainer-api",
    responsibility: "control-plane-api",
  });
}
