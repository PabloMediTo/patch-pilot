import assert from "node:assert/strict";

import { createMaintainerWorkerApplication } from "./index.js";

assert.deepEqual(createMaintainerWorkerApplication(), {
  name: "maintainer-worker",
  responsibility: "maintenance-worker",
});
