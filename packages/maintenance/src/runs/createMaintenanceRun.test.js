import assert from "node:assert/strict";

import { createMaintenanceRun } from "./index.js";

const run = createMaintenanceRun({
    id: "run-1",
    installationId: 7,
    repository: "PabloMediTo/patch-pilot",
    issueNumber: 42,
    baseRevision: "a".repeat(40),
    actorId: 9,
    sourceDeliveryId: "delivery-1",
});

assert.deepEqual(run, {
  id: "run-1",
  installationId: 7,
  repository: "PabloMediTo/patch-pilot",
  issueNumber: 42,
  baseRevision: "a".repeat(40),
  actorId: 9,
  sourceDeliveryId: "delivery-1",
  status: "submitted",
});

assert.throws(() => createMaintenanceRun({ id: "run-2", repository: "invalid",
  issueNumber: 0, baseRevision: "abc123" }), /valid identity/u);
