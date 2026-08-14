import assert from "node:assert/strict";

import { createMaintenanceRun } from "./index.js";

const run = createMaintenanceRun({
  id: "run-1",
  repository: "PabloMediTo/patch-pilot",
  issueNumber: 42,
  baseRevision: "abc123",
});

assert.deepEqual(run, {
  id: "run-1",
  repository: "PabloMediTo/patch-pilot",
  issueNumber: 42,
  baseRevision: "abc123",
  status: "submitted",
});
