import { handleRunApprovalRequest } from "../run-approval-http/index.js";
import { handleRunReviewEvidenceRequest } from "../run-review-evidence-http/index.js";
import { handleRunTimelineRequest } from "../run-timeline-http/index.js";

/**
 * Dispatches one control-plane API request across its focused route roles.
 *
 * @param {{ request: object, response: object, approval: object, reviewEvidence: object, timeline: object }} input HTTP exchange and role ports.
 * @returns {Promise<object>} Terminal dispatch outcome.
 */
export async function handleMaintainerApiRequest(input) {
  const exchange = Object.freeze({ request: input.request, response: input.response });
  const reviewOutcome = await handleRunReviewEvidenceRequest({ ...exchange, ...input.reviewEvidence });
  if (reviewOutcome.status !== "unhandled") return reviewOutcome;
  const approvalOutcome = await handleRunApprovalRequest({ ...exchange, ...input.approval });
  if (approvalOutcome.status !== "unhandled") return approvalOutcome;
  const timelineOutcome = await handleRunTimelineRequest({ ...exchange, ...input.timeline });
  if (timelineOutcome.status !== "unhandled") return timelineOutcome;
  input.response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
  input.response.end('{"error":"not-found"}');
  return Object.freeze({ status: "not-found", statusCode: 404 });
}
