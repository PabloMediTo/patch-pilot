/**
 * Reads the canonical ordered timeline for one run.
 *
 * @param {{ runId: string, store: object }} input Run and persistence port.
 * @returns {Promise<object[]>} Immutable events ordered by sequence.
 * @throws {Error} When input is invalid.
 */
export async function listRunTimeline(input) {
  if (typeof input?.runId !== "string" || input.runId.trim() === ""
    || typeof input?.store?.list !== "function") {
    throw new Error("Timeline query requires a run ID and persistence port.");
  }
  const events = await input.store.list(input.runId);
  return Object.freeze(events.map((event) => Object.freeze(event)));
}
