import assert from "node:assert/strict";

import { createMaintenanceRun } from "./index.js";

const run = createMaintenanceRun({
    id: "run-1",
    installationId: 7,
    repository: "PabloMediTo/patch-pilot",
    issueNumber: 42,
    baseRevision: "abc123",
    actorId: 9,
    sourceDeliveryId: "delivery-1",
});

assert.deepEqual(run, {
  id: "run-1",
  installationId: 7,
  repository: "PabloMediTo/patch-pilot",
  issueNumber: 42,
  baseRevision: "abc123",
  actorId: 9,
  sourceDeliveryId: "delivery-1",
  status: "submitted",
});
