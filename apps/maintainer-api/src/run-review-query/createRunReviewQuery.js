/**
 * Composes canonical review, timeline, and approval stores into API query ports.
 *
 * @param {{ reviewStore: object, timelineStore: object, approvalStore: object }} input Persisted evidence stores.
 * @returns {{ loadRunReviewEvidence: Function, loadApprovalState: Function }} Immutable query operations.
 */
export function createRunReviewQuery(input) {
  assertStores(input);

  return Object.freeze({
    loadRunReviewEvidence: async (runId) => {
      assertRunId(runId);
      const snapshot = await input.reviewStore.get(runId);
      if (snapshot === null) return null;

      const [timeline, approval] = await Promise.all([
        input.timelineStore.list(runId),
        input.approvalStore.get(runId),
      ]);
      if (!Array.isArray(timeline)) {
        throw new Error("Run timeline store must return an event array.");
      }

      return Object.freeze({
        run: snapshot.run,
        timeline: Object.freeze([...timeline]),
        proposal: snapshot.proposal,
        verification: snapshot.verification,
        critique: snapshot.critique,
        ...(approval === null ? {} : { approval }),
      });
    },
    loadApprovalState: async (runId) => {
      assertRunId(runId);
      const [snapshot, decision] = await Promise.all([
        input.reviewStore.get(runId),
        input.approvalStore.get(runId),
      ]);
      return Object.freeze({
        runStatus: snapshot?.run?.status ?? null,
        decision,
        reviewBinding: snapshot?.reviewBinding ?? null,
      });
    },
  });
}

/** Requires the three canonical store read contracts. */
function assertStores(input) {
  if (typeof input?.reviewStore?.get !== "function"
    || typeof input?.timelineStore?.list !== "function"
    || typeof input?.approvalStore?.get !== "function") {
    throw new Error("Run review query requires review, timeline, and approval stores.");
  }
}

/** Prevents ambiguous or cross-run store reads. */
function assertRunId(runId) {
  if (typeof runId !== "string" || runId.trim() === "") {
    throw new Error("Run review query requires a run ID.");
  }
}
