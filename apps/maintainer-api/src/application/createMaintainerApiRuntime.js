import { createApiBearerAuthentication } from "../api-authentication/index.js";
import { createMaintainerApiServer } from "../api-server/index.js";
import { createRunReviewQuery } from "../run-review-query/index.js";

/**
 * Composes the unstarted API server with deployment authentication and explicit data ports.
 *
 * @param {{ environment: object, githubWebhook: object, reviewStore: object, timelineStore: object, approvalStore: object, timelineStream: object, notifyApprovalDecision: Function, clock?: Function, scheduleHeartbeat?: Function, maxBodyBytes?: number }} options Deployment values and persisted evidence ports.
 * @returns {{ server: object }} Immutable API runtime resources.
 */
export function createMaintainerApiRuntime(options) {
  const authentication = createApiBearerAuthentication(options?.environment);
  const reviewQuery = createRunReviewQuery({
    reviewStore: options.reviewStore,
    timelineStore: options.timelineStore,
    approvalStore: options.approvalStore,
  });
  assertDecisionStore(options.approvalStore);
  if (typeof options.notifyApprovalDecision !== "function") {
    throw new Error("API runtime requires a Temporal approval notification port.");
  }
  const server = createMaintainerApiServer({ authentication,
    githubWebhook: options.githubWebhook,
    approval: { loadApprovalState: reviewQuery.loadApprovalState,
      saveFirstDecision: options.approvalStore.saveFirstDecision,
      notifyApprovalDecision: options.notifyApprovalDecision, clock: options.clock },
    reviewEvidence: { loadRunReviewEvidence: reviewQuery.loadRunReviewEvidence },
    timeline: { store: options.timelineStore, stream: options.timelineStream,
      scheduleHeartbeat: options.scheduleHeartbeat },
    maxBodyBytes: options.maxBodyBytes });
  return Object.freeze({ server });
}

/** Requires the atomic approval write paired with the composed state query. */
function assertDecisionStore(approvalStore) {
  if (typeof approvalStore?.saveFirstDecision !== "function") {
    throw new Error("API runtime requires an approval decision store.");
  }
}
