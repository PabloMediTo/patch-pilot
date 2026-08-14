/**
 * Creates the review web application identity used by its composition root.
 *
 * @returns {{ name: string, responsibility: string }} The immutable application identity.
 */
export function createMaintainerWebApplication() {
  return Object.freeze({
    name: "maintainer-web",
    responsibility: "review-web-interface",
  });
}
