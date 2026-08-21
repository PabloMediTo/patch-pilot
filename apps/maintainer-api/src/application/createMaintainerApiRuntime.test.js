import assert from "node:assert/strict";

import { createMaintainerApiRuntime } from "./index.js";

const runtime = createMaintainerApiRuntime({ environment: {
  PATCH_PILOT_API_BEARER_TOKEN: "private-api-token-with-at-least-32-characters",
  PATCH_PILOT_API_ACTOR_ID: "operator:pablo",
}, githubWebhook: {}, reviewStore: { get: async () => null },
timelineStore: { list: async () => [] }, approvalStore: {
  get: async () => null, saveFirstDecision: async () => ({ status: "created" }),
}, timelineStream: { subscribe: async () => async () => undefined },
notifyApprovalDecision: async () => undefined });

assert.equal(typeof runtime.server.listen, "function");
assert.equal(Object.isFrozen(runtime), true);
assert.throws(() => createMaintainerApiRuntime({ environment: {}, githubWebhook: {},
  reviewStore: {}, timelineStore: {}, approvalStore: {}, timelineStream: {} }), /PATCH_PILOT_API_BEARER_TOKEN/u);
assert.throws(() => createMaintainerApiRuntime({ environment: {
  PATCH_PILOT_API_BEARER_TOKEN: "private-api-token-with-at-least-32-characters",
  PATCH_PILOT_API_ACTOR_ID: "operator:pablo",
}, githubWebhook: {}, reviewStore: {}, timelineStore: {}, approvalStore: {}, timelineStream: {} }), /requires review/u);
assert.throws(() => createMaintainerApiRuntime({ environment: {
  PATCH_PILOT_API_BEARER_TOKEN: "private-api-token-with-at-least-32-characters",
  PATCH_PILOT_API_ACTOR_ID: "operator:pablo",
}, githubWebhook: {}, reviewStore: { get: async () => null }, timelineStore: { list: async () => [] },
approvalStore: { get: async () => null }, timelineStream: {} }), /approval decision store/u);
assert.throws(() => createMaintainerApiRuntime({ environment: {
  PATCH_PILOT_API_BEARER_TOKEN: "private-api-token-with-at-least-32-characters",
  PATCH_PILOT_API_ACTOR_ID: "operator:pablo",
}, githubWebhook: {}, reviewStore: { get: async () => null },
timelineStore: { list: async () => [] }, approvalStore: {
  get: async () => null, saveFirstDecision: async () => undefined,
}, timelineStream: {} }), /approval notification/u);
