import assert from "node:assert/strict";

import { createMaintainerWebApplication } from "./index.js";

assert.deepEqual(createMaintainerWebApplication(), {
  name: "maintainer-web",
  responsibility: "review-web-interface",
});
