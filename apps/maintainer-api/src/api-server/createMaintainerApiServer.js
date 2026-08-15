import { Buffer } from "node:buffer";
import { createServer } from "node:http";
import { clearInterval, setInterval } from "node:timers";
import { URLSearchParams } from "node:url";

import { handleMaintainerApiRequest } from "../api-http/index.js";

const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

/**
 * Creates the concrete Node server for control-plane API routes.
 *
 * @param {{ approval: object, reviewEvidence: object, timeline: object, maxBodyBytes?: number }} input Role integrations and body policy.
 * @returns {import("node:http").Server} Unstarted API server.
 */
export function createMaintainerApiServer(input) {
  const ports = createRuntimePorts(input);
  return createServer((request, response) => {
    handleMaintainerApiRequest({ request, response, ...ports }).catch((error) => writeServerError(response, error));
  });
}

/** Adds transport-owned body, clock, and heartbeat ports. */
function createRuntimePorts(input) {
  const maxBodyBytes = input?.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  if (!Number.isSafeInteger(maxBodyBytes) || maxBodyBytes < 1) throw new Error("API body limit must be a positive integer.");
  return Object.freeze({
    reviewEvidence: input.reviewEvidence,
    approval: Object.freeze({ ...input.approval,
      readRequestBody: (request) => readRequestBody(request, maxBodyBytes),
      clock: input.approval.clock ?? (() => new Date()),
    }),
    timeline: Object.freeze({ ...input.timeline,
      scheduleHeartbeat: input.timeline.scheduleHeartbeat ?? scheduleHeartbeat,
    }),
  });
}

/** Reads and parses one bounded approval request body. */
async function readRequestBody(request, maxBodyBytes) {
  const chunks = [];
  let byteCount = 0;
  for await (const chunk of request) {
    byteCount += chunk.length;
    if (byteCount > maxBodyBytes) throw badRequest("request-body-too-large");
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString("utf8");
  if (body === "") return Object.freeze({});
  const contentType = request.headers["content-type"]?.split(";", 1)[0].trim().toLowerCase();
  if (contentType === "application/json") return parseJsonBody(body);
  if (contentType === "application/x-www-form-urlencoded") return Object.freeze(Object.fromEntries(new URLSearchParams(body)));
  throw badRequest("unsupported-content-type");
}

/** Parses one JSON object request body. */
function parseJsonBody(body) {
  try {
    const parsed = JSON.parse(body);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    return Object.freeze(parsed);
  } catch (error) {
    throw badRequest("invalid-json", error);
  }
}

/** Creates a transport error with a stable client status. */
function badRequest(reason, cause) {
  const error = new Error(reason, { cause });
  error.statusCode = 400;
  return error;
}

/** Schedules a repeating SSE heartbeat and returns its cancellation port. */
function scheduleHeartbeat(callback, intervalMs) {
  const timer = setInterval(callback, intervalMs);
  return () => clearInterval(timer);
}

/** Terminates unexpected API integration failures. */
function writeServerError(response, error) {
  if (response.headersSent) return response.destroy(error);
  const statusCode = error.statusCode === 400 ? 400 : 500;
  const reason = statusCode === 400 ? error.message : "internal-server-error";
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify({ error: reason }));
  return undefined;
}
