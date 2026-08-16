import { URL } from "node:url";

import { hasValidGitHubWebhookSignature } from "./hasValidGitHubWebhookSignature.js";

const WEBHOOK_PATH = "/github/webhooks";

/**
 * Authenticates and dispatches one bounded GitHub webhook HTTP request.
 *
 * @param {{ request: object, response: object, secret: string, readRawBody: Function, ingestWebhook: Function, clock?: Function }} input HTTP exchange, security material, and ingestion port.
 * @returns {Promise<object>} Terminal or unhandled HTTP outcome.
 */
export async function handleGitHubWebhookRequest(input) {
  if (new URL(input.request.url, "http://localhost").pathname !== WEBHOOK_PATH) {
    return Object.freeze({ status: "unhandled" });
  }
  if (input.request.method !== "POST") return writeResponse(input.response, 405,
    { body: { status: "rejected", reason: "method-not-allowed" }, headers: { allow: "POST" } });
  assertPorts(input);
  const envelope = await readAuthenticatedEnvelope(input);
  if (envelope === null) return writeResponse(input.response, 401,
    { body: { status: "rejected", reason: "invalid-signature" } });
  try {
    const outcome = await input.ingestWebhook(envelope);
    return writeOutcome(input.response, outcome);
  } catch (error) {
    if (error?.code === "invalid-github-webhook") {
      return writeResponse(input.response, 400,
        { body: { status: "rejected", reason: "invalid-payload" } });
    }
    throw error;
  }
}

/** Reads, authenticates, and parses one GitHub webhook envelope. */
async function readAuthenticatedEnvelope(input) {
  const rawBody = await input.readRawBody(input.request);
  const signature = readHeader(input.request, "x-hub-signature-256");
  if (!hasValidGitHubWebhookSignature({ rawBody, secret: input.secret, signature })) return null;
  return Object.freeze({ deliveryId: readRequiredHeader(input.request, "x-github-delivery"),
    eventName: readRequiredHeader(input.request, "x-github-event"), payload: parsePayload(rawBody),
    observedAt: (input.clock ?? (() => new Date()))().toISOString() });
}

/** Rejects incomplete deployment wiring before reading a request body. */
function assertPorts(input) {
  if (typeof input.secret !== "string" || input.secret === ""
    || typeof input.readRawBody !== "function" || typeof input.ingestWebhook !== "function") {
    throw new Error("GitHub webhook handler requires secret, body, and ingestion ports.");
  }
}

/** Reads one scalar Node request header. */
function readHeader(request, name) {
  const value = request.headers[name];
  return typeof value === "string" ? value : "";
}

/** Requires an authenticated webhook envelope identity header. */
function readRequiredHeader(request, name) {
  const value = readHeader(request, name);
  if (value.trim() === "") throw badRequest(`missing-${name}`);
  return value;
}

/** Parses an authenticated JSON object without changing the signed bytes. */
function parsePayload(rawBody) {
  try {
    const payload = JSON.parse(rawBody);
    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("not an object");
    }
    return Object.freeze(payload);
  } catch (error) {
    throw badRequest("invalid-github-json", error);
  }
}

/** Creates a transport error with a stable client status. */
function badRequest(reason, cause) {
  const error = new Error(reason, { cause });
  error.statusCode = 400;
  return error;
}

/** Maps domain reconciliation outcomes to stable webhook acknowledgements. */
function writeOutcome(response, outcome) {
  const statusCode = outcome?.status === "conflict" ? 409 : 202;
  const body = outcome?.reason === undefined ? { status: outcome.status }
    : { status: outcome.status, reason: outcome.reason };
  return writeResponse(response, statusCode, { body });
}

/** Writes one no-store JSON response and returns its dispatch evidence. */
function writeResponse(response, statusCode, options) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store", ...options.headers });
  response.end(JSON.stringify(options.body));
  return Object.freeze({ status: "handled", statusCode, body: Object.freeze(options.body) });
}
