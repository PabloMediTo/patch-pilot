import assert from "node:assert/strict";

import { createMaintainerApiRuntime } from "./index.js";

const runtime = createMaintainerApiRuntime({ environment: {
  PATCH_PILOT_API_BEARER_TOKEN: "private-api-token-with-at-least-32-characters",
  PATCH_PILOT_API_ACTOR_ID: "operator:pablo",
}, githubWebhook: {}, approval: {}, reviewEvidence: {}, timeline: {} });

assert.equal(typeof runtime.server.listen, "function");
assert.equal(Object.isFrozen(runtime), true);
assert.throws(() => createMaintainerApiRuntime({ environment: {}, githubWebhook: {},
  approval: {}, reviewEvidence: {}, timeline: {} }), /PATCH_PILOT_API_BEARER_TOKEN/u);
