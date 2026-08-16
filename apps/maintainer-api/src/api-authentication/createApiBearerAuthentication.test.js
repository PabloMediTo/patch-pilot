import assert from "node:assert/strict";

import { createApiBearerAuthentication } from "./index.js";

const token = "private-api-token-with-at-least-32-characters";
const environment = { PATCH_PILOT_API_BEARER_TOKEN: token,
  PATCH_PILOT_API_ACTOR_ID: "operator:pablo" };
const authentication = createApiBearerAuthentication(environment);

assert.deepEqual(authentication.authenticateRequest(createRequest(`Bearer ${token}`)),
  { id: "operator:pablo" });
assert.deepEqual(authentication.authenticateRequest(createRequest(`bearer ${token}`)),
  { id: "operator:pablo" });
assert.equal(authentication.authenticateRequest(createRequest("Bearer incorrect-token")), null);
assert.equal(authentication.authenticateRequest(createRequest()), null);
assert.equal(authentication.authenticateRequest({ headers: { authorization: [token] } }), null);
assert.equal(authentication.authorizeRunAccess({ runId: "run-1",
  request: createRequest(`Bearer ${token}`) }), true);
assert.equal(authentication.authorizeRunAccess({ runId: "run-1",
  request: createRequest("Basic credentials") }), false);
assert.equal(Object.isFrozen(authentication), true);

assert.throws(() => createApiBearerAuthentication({ ...environment,
  PATCH_PILOT_API_BEARER_TOKEN: "short" }), /at least 32 characters/u);
assert.throws(() => createApiBearerAuthentication({ ...environment,
  PATCH_PILOT_API_ACTOR_ID: "unsafe actor" }), /safe non-empty actor identity/u);

/** Creates one request containing an optional authorization header. */
function createRequest(authorization) {
  return { headers: authorization === undefined ? {} : { authorization } };
}
