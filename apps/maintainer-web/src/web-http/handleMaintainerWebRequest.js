import { URL } from "node:url";

import { handleRunReviewRequest } from "../run-review-http/index.js";
import { handleRunReviewLiveAsset } from "../run-review-live/index.js";
import { handleRunReviewStyleAsset } from "../run-review-style/index.js";

const API_ROUTE_PATTERN = /^\/runs\/[^/]+\/(?:timeline|approval\/(?:approve|reject))$/u;

/**
 * Dispatches same-origin review traffic and forwards API-owned routes.
 *
 * @param {{ request: object, response: object, authorizeRunAccess: Function, loadRunReviewEvidence: Function, forwardApiRequest: Function }} input HTTP integration ports.
 * @returns {Promise<object>} Dispatch outcome.
 */
export async function handleMaintainerWebRequest(input) {
  assertPorts(input);
  const assetOutcome = handleRunReviewLiveAsset(input);
  if (assetOutcome.status !== "unhandled") return assetOutcome;
  const styleOutcome = handleRunReviewStyleAsset(input);
  if (styleOutcome.status !== "unhandled") return styleOutcome;
  const reviewOutcome = await handleRunReviewRequest(input);
  if (reviewOutcome.status !== "unhandled") return reviewOutcome;
  if (isApiRoute(input.request.url)) {
    await input.forwardApiRequest(Object.freeze({ request: input.request, response: input.response }));
    return Object.freeze({ status: "forwarded" });
  }
  input.response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  input.response.end("Not found");
  return Object.freeze({ status: "not-found" });
}

/** Validates dispatcher-specific integration ports. */
function assertPorts(input) {
  if (typeof input?.forwardApiRequest !== "function") {
    throw new Error("Web HTTP dispatcher requires an API forwarding port.");
  }
}

/** Identifies routes owned by the API deployment unit. */
function isApiRoute(requestUrl) {
  return API_ROUTE_PATTERN.test(new URL(requestUrl, "http://patch-pilot.local").pathname);
}
