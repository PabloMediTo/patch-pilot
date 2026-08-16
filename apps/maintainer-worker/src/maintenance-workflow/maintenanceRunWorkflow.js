import { proxyActivities } from "@temporalio/workflow";

import { orchestrateMaintenanceRun } from "./orchestrateMaintenanceRun.js";

const timelineActivities = proxyActivities({ startToCloseTimeout: "30 seconds",
  retry: { maximumAttempts: 5, initialInterval: "1 second", backoffCoefficient: 2,
    maximumInterval: "30 seconds" } });
const inspectionActivities = proxyActivities({ startToCloseTimeout: "10 minutes",
  retry: { maximumAttempts: 3, initialInterval: "5 seconds", backoffCoefficient: 2,
    maximumInterval: "1 minute" } });

/**
 * Runs the first durable phase of one submitted maintenance run.
 *
 * @param {object} run Canonical persisted submitted run.
 * @returns {Promise<object>} Inspection-phase outcome.
 */
export function maintenanceRunWorkflow(run) {
  return orchestrateMaintenanceRun({ run,
    recordTimelineEvent: timelineActivities.recordTimelineEvent,
    inspectRepository: inspectionActivities.inspectRepository,
    now: () => new Date().toISOString() });
}
