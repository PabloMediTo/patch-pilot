import assert from "node:assert/strict";

import { createMaintainerApiApplication } from "./index.js";

assert.deepEqual(createMaintainerApiApplication(), {
  name: "maintainer-api",
  responsibility: "control-plane-api",
});
