import { createServer, request as sendHttpRequest } from "node:http";
import { request as sendHttpsRequest } from "node:https";
import { URL } from "node:url";

import { handleMaintainerWebRequest } from "../web-http/index.js";

/**
 * Creates the concrete Node HTTP server for the browser-facing web origin.
 *
 * @param {{ apiOrigin: string, authorizeRunAccess: Function, loadRunReviewEvidence: Function }} input Runtime ports and API location.
 * @returns {import("node:http").Server} Unstarted Node HTTP server.
 */
export function createMaintainerWebServer(input) {
  const ports = createRuntimePorts(input);
  return createServer((request, response) => {
    handleRequest(request, response, ports).catch((error) => writeServerError(response, error));
  });
}

/** Validates and freezes the runtime integration. */
function createRuntimePorts(input) {
  if (typeof input?.authorizeRunAccess !== "function" || typeof input?.loadRunReviewEvidence !== "function") {
    throw new Error("Web server requires authorization and review evidence ports.");
  }
  const apiOrigin = new URL(input.apiOrigin);
  if (apiOrigin.protocol !== "http:" && apiOrigin.protocol !== "https:") {
    throw new Error("Web server API origin must use HTTP or HTTPS.");
  }
  return Object.freeze({ ...input, apiOrigin });
}

/** Composes one Node exchange with the framework-independent dispatcher. */
async function handleRequest(request, response, ports) {
  await handleMaintainerWebRequest({
    request, response,
    authorizeRunAccess: ports.authorizeRunAccess,
    loadRunReviewEvidence: ports.loadRunReviewEvidence,
    forwardApiRequest: (exchange) => forwardApiRequest(exchange, ports.apiOrigin),
  });
}

/** Streams one browser request and API response without buffering SSE or bodies. */
function forwardApiRequest(exchange, apiOrigin) {
  return new Promise((resolve, reject) => {
    const target = new URL(exchange.request.url, apiOrigin);
    const sendRequest = target.protocol === "https:" ? sendHttpsRequest : sendHttpRequest;
    const upstream = sendRequest(target, {
      method: exchange.request.method,
      headers: { ...exchange.request.headers, host: target.host },
    }, (upstreamResponse) => {
      exchange.response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(exchange.response);
      upstreamResponse.once("end", resolve);
    });
    upstream.once("error", reject);
    exchange.request.once("aborted", () => upstream.destroy());
    exchange.response.once("close", () => upstream.destroy());
    exchange.request.pipe(upstream);
  });
}

/** Terminates unexpected server integration failures. */
function writeServerError(response, error) {
  if (response.headersSent) return response.destroy(error);
  response.writeHead(502, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ error: "web-upstream-failure" }));
  return undefined;
}
