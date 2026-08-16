import { createHash, timingSafeEqual } from "node:crypto";

const TOKEN_ENVIRONMENT_KEY = "PATCH_PILOT_API_BEARER_TOKEN";
const ACTOR_ENVIRONMENT_KEY = "PATCH_PILOT_API_ACTOR_ID";
const ACTOR_ID = /^[A-Za-z0-9_.:@-]{1,128}$/u;
const BEARER_CREDENTIAL = /^Bearer ([^\s]+)$/iu;

/**
 * Creates the single-operator API authentication ports from deployment environment values.
 *
 * @param {Record<string, string | undefined>} environment Deployment environment.
 * @returns {{ authenticateRequest: Function, authorizeRunAccess: Function }} Immutable auth ports.
 */
export function createApiBearerAuthentication(environment) {
  const token = readBearerToken(environment?.[TOKEN_ENVIRONMENT_KEY]);
  const actor = Object.freeze({ id: readActorId(environment?.[ACTOR_ENVIRONMENT_KEY]) });
  const authenticateRequest = (request) => {
    const supplied = readSuppliedToken(request?.headers?.authorization);
    return hasEqualSecret(supplied, token) ? actor : null;
  };
  return Object.freeze({
    authenticateRequest,
    authorizeRunAccess: ({ request }) => authenticateRequest(request) !== null,
  });
}

/** Validates the deployment bearer token without returning it in errors. */
function readBearerToken(value) {
  if (typeof value !== "string" || value.length < 32 || /\s/u.test(value)) {
    throw new Error(`${TOKEN_ENVIRONMENT_KEY} must be a whitespace-free secret of at least 32 characters.`);
  }
  return value;
}

/** Validates the stable audit actor identity attached to approval decisions. */
function readActorId(value) {
  if (typeof value !== "string" || !ACTOR_ID.test(value)) {
    throw new Error(`${ACTOR_ENVIRONMENT_KEY} must be a safe non-empty actor identity.`);
  }
  return value;
}

/** Extracts a scalar bearer credential without accepting surrounding whitespace. */
function readSuppliedToken(authorization) {
  if (typeof authorization !== "string") return "";
  return BEARER_CREDENTIAL.exec(authorization)?.[1] ?? "";
}

/** Compares fixed-length digests so different credential lengths follow the same comparison path. */
function hasEqualSecret(supplied, expected) {
  const suppliedDigest = createHash("sha256").update(supplied, "utf8").digest();
  const expectedDigest = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(suppliedDigest, expectedDigest);
}
