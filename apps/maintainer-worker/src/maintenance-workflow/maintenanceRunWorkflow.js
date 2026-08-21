import { proxyActivities } from "@temporalio/workflow";

import { orchestrateMaintenanceRun } from "./orchestrateMaintenanceRun.js";

const timelineActivities = proxyActivities({ startToCloseTimeout: "30 seconds",
  retry: { maximumAttempts: 5, initialInterval: "1 second", backoffCoefficient: 2,
    maximumInterval: "30 seconds" } });
const inspectionActivities = proxyActivities({ startToCloseTimeout: "10 minutes",
  retry: { maximumAttempts: 3, initialInterval: "5 seconds", backoffCoefficient: 2,
    maximumInterval: "1 minute" } });
const proposalActivities = proxyActivities({ startToCloseTimeout: "5 minutes",
  retry: { maximumAttempts: 3, initialInterval: "5 seconds", backoffCoefficient: 2,
    maximumInterval: "1 minute" } });
const attemptActivities = proxyActivities({ startToCloseTimeout: "30 minutes",
  retry: { maximumAttempts: 3, initialInterval: "10 seconds", backoffCoefficient: 2,
    maximumInterval: "2 minutes" } });

/**
 * Runs the durable inspection and reproduction phases of one submitted maintenance run.
 *
 * @param {object} run Canonical persisted submitted run.
 * @returns {Promise<object>} Reproduction-phase or unsupported outcome.
 */
export function maintenanceRunWorkflow(run) {
  return orchestrateMaintenanceRun({ run,
    recordTimelineEvent: timelineActivities.recordTimelineEvent,
    inspectRepository: inspectionActivities.inspectRepository,
    reproduceIssue: inspectionActivities.reproduceIssue,
    collectPlanningContext: inspectionActivities.collectPlanningContext,
    createProposal: proposalActivities.createProposal,
    executeProposalAttempts: attemptActivities.executeProposalAttempts,
    recordReviewSnapshot: timelineActivities.recordReviewSnapshot,
    now: () => new Date().toISOString() });
}
