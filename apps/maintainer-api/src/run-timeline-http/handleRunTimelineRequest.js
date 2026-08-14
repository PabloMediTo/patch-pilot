import { URL } from "node:url";

import { openRunTimelineSseSession } from "../run-timeline-feed/index.js";

const ROUTE_PATTERN = /^\/runs\/([^/]+)\/timeline$/u;

/**
 * Handles the authenticated HTTP endpoint for one run's timeline SSE stream.
 *
 * @param {{ request: object, response: object, authorizeRunAccess: Function, store: object, stream: object, scheduleHeartbeat: Function }} input HTTP and timeline ports.
 * @returns {Promise<object>} Unhandled, rejected, or streaming route outcome.
 */
export async function handleRunTimelineRequest(input) {
  assertHttpPorts(input);
  const route = parseRoute(input.request.url);
  if (route === null) return Object.freeze({ status: "unhandled" });
  if (input.request.method !== "GET") {
    return rejectRequest(input.response, {
      statusCode: 405,
      reason: "method-not-allowed",
      headers: { allow: "GET" },
    });
  }

  const afterSequence = parseLastEventId(input.request.headers?.["last-event-id"]);
  if (afterSequence === null) {
    return rejectRequest(input.response, { statusCode: 400, reason: "invalid-last-event-id" });
  }

  const hasAccess = await input.authorizeRunAccess(Object.freeze({
    runId: route.runId,
    request: input.request,
  }));
  if (!hasAccess) {
    return rejectRequest(input.response, { statusCode: 401, reason: "unauthorized" });
  }

  const session = await openRunTimelineSseSession({
    runId: route.runId,
    afterSequence,
    store: input.store,
    stream: input.stream,
    response: createSseResponse(input.request, input.response),
    scheduleHeartbeat: input.scheduleHeartbeat,
  });
  return Object.freeze({ status: "streaming", runId: route.runId, session });
}

/**
 * Validates the request, response, and authorization ports.
 *
 * @param {object} input Handler input.
 * @returns {void}
 * @throws {Error} When HTTP integration is incomplete.
 */
function assertHttpPorts(input) {
  const hasRequest = typeof input?.request?.url === "string"
    && typeof input?.request?.method === "string"
    && typeof input.request.on === "function";
  const hasResponse = typeof input?.response?.writeHead === "function"
    && typeof input?.response?.write === "function"
    && typeof input?.response?.end === "function";
  if (!hasRequest || !hasResponse || typeof input?.authorizeRunAccess !== "function") {
    throw new Error("Timeline HTTP handler requires request, response, and authorization ports.");
  }
}

/**
 * Matches and decodes the one supported route.
 *
 * @param {string} requestUrl Request target.
 * @returns {{ runId: string } | null} Route values or no match.
 */
function parseRoute(requestUrl) {
  const pathname = new URL(requestUrl, "http://patch-pilot.local").pathname;
  const match = ROUTE_PATTERN.exec(pathname);
  if (match === null) return null;
  try {
    const runId = decodeURIComponent(match[1]);
    return runId.trim() === "" ? null : Object.freeze({ runId });
  } catch {
    return null;
  }
}

/**
 * Parses an optional SSE resume sequence.
 *
 * @param {unknown} candidate Last-Event-ID header.
 * @returns {number | undefined | null} Resume sequence, absence, or invalid marker.
 */
function parseLastEventId(candidate) {
  if (candidate === undefined || candidate === "") return undefined;
  if (typeof candidate !== "string" || !/^\d+$/u.test(candidate)) return null;
  const sequence = Number(candidate);
  return Number.isSafeInteger(sequence) ? sequence : null;
}

/**
 * Adapts a Node-compatible request and response to the SSE session port.
 *
 * @param {object} request HTTP request.
 * @param {object} response HTTP response.
 * @returns {object} SSE response port.
 */
function createSseResponse(request, response) {
  return Object.freeze({
    start: ({ statusCode, headers }) => response.writeHead(statusCode, headers),
    write: (frame) => response.write(frame),
    onClose: (handler) => request.on("close", handler),
  });
}

/**
 * Writes one terminal JSON rejection and creates its route outcome.
 *
 * @param {object} response HTTP response.
 * @param {{ statusCode: number, reason: string, headers?: object }} rejection Rejection details.
 * @returns {object} Immutable rejected route outcome.
 */
function rejectRequest(response, rejection) {
  response.writeHead(rejection.statusCode, {
    "content-type": "application/json; charset=utf-8",
    ...rejection.headers,
  });
  response.end(JSON.stringify({ error: rejection.reason }));
  return Object.freeze({ status: "rejected", reason: rejection.reason });
}
