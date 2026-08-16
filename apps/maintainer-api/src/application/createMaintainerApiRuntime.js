import { createApiBearerAuthentication } from "../api-authentication/index.js";
import { createMaintainerApiServer } from "../api-server/index.js";

/**
 * Composes the unstarted API server with deployment authentication and explicit data ports.
 *
 * @param {{ environment: object, githubWebhook: object, approval: object, reviewEvidence: object, timeline: object, maxBodyBytes?: number }} options Deployment values and still-explicit persisted data ports.
 * @returns {{ server: object }} Immutable API runtime resources.
 */
export function createMaintainerApiRuntime(options) {
  const authentication = createApiBearerAuthentication(options?.environment);
  const server = createMaintainerApiServer({ authentication,
    githubWebhook: options.githubWebhook, approval: options.approval,
    reviewEvidence: options.reviewEvidence, timeline: options.timeline,
    maxBodyBytes: options.maxBodyBytes });
  return Object.freeze({ server });
}
