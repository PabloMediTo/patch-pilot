import { decideRunApproval } from "@patch-pilot/maintenance";
import { URL } from "node:url";

const ROUTE_PATTERN = /^\/runs\/([^/]+)\/approval\/(approve|reject)$/u;

/** Handles one authenticated human approval submission. */
export async function handleRunApprovalRequest(input) {
  assertPorts(input);
  const route = parseRoute(input.request.url);
  if (route === null) return Object.freeze({ status: "unhandled" });
  if (input.request.method !== "POST") return writeJson(input.response, { statusCode: 405, body: { error: "method-not-allowed" }, headers: { allow: "POST" } });
  const actor = await input.authenticateRequest(input.request);
  if (typeof actor?.id !== "string" || actor.id.trim() === "") return writeJson(input.response, { statusCode: 401, body: { error: "unauthorized" } });
  const idempotencyKey = input.request.headers?.["idempotency-key"];
  if (typeof idempotencyKey !== "string" || idempotencyKey.trim() === "") return writeJson(input.response, { statusCode: 400, body: { error: "missing-idempotency-key" } });
  const body = await input.readRequestBody(input.request);
  const result = await decideRunApproval({
    runId: route.runId, actorId: actor.id, idempotencyKey,
    decision: route.decision, reason: body?.reason, decidedAt: input.clock().toISOString(),
    loadApprovalState: input.loadApprovalState, saveFirstDecision: input.saveFirstDecision,
  });
  return writeApprovalOutcome(input.response, result);
}

/** Validates required integration ports. */
function assertPorts(input) {
  const functions = [input?.authenticateRequest, input?.readRequestBody, input?.loadApprovalState, input?.saveFirstDecision, input?.clock];
  if (typeof input?.request?.url !== "string" || typeof input?.response?.writeHead !== "function"
    || typeof input.response.end !== "function" || functions.some((port) => typeof port !== "function")) {
    throw new Error("Approval HTTP handler requires request, response, auth, body, persistence, and clock ports.");
  }
}

/** Parses the supported approval route. */
function parseRoute(requestUrl) {
  const match = ROUTE_PATTERN.exec(new URL(requestUrl, "http://patch-pilot.local").pathname);
  if (match === null) return null;
  try { return Object.freeze({ runId: decodeURIComponent(match[1]), decision: match[2] === "approve" ? "approved" : "rejected" }); }
  catch { return null; }
}

/** Maps domain outcomes to stable HTTP responses. */
function writeApprovalOutcome(response, result) {
  if (result.status === "created") return writeJson(response, { statusCode: 201, body: result });
  if (result.status === "replayed") return writeJson(response, { statusCode: 200, body: result });
  return writeJson(response, { statusCode: 409, body: result });
}

/** Writes a terminal JSON response. */
function writeJson(response, output) {
  response.writeHead(output.statusCode, { "content-type": "application/json; charset=utf-8", ...output.headers });
  response.end(JSON.stringify(output.body));
  return Object.freeze({ status: output.statusCode < 400 ? "accepted" : "rejected", statusCode: output.statusCode, body: output.body });
}
