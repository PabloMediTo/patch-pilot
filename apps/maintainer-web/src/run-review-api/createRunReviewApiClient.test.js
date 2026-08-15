import assert from "node:assert/strict";
import { createServer } from "node:http";

import { createRunReviewApiClient } from "./index.js";

const requests = [];
const api = createServer((request, response) => {
  requests.push({ url: request.url, authorization: request.headers.authorization, cookie: request.headers.cookie, ignored: request.headers["x-ignored"] });
  const statusCode = request.url.includes("missing") ? 404 : request.url.includes("unauthorized") ? 401 : 200;
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(statusCode === 200 ? JSON.stringify({ run: { id: "run private" } }) : "{}");
});
await listen(api);

const client = createRunReviewApiClient({ apiOrigin: originOf(api) });
const available = await client.loadRunReviewAccess({
  runId: "run private", request: { headers: { authorization: "Bearer token", cookie: "session=abc", "x-ignored": "secret" } },
});
assert.deepEqual(available, { status: "available", evidence: { run: { id: "run private" } } });
assert.deepEqual(requests[0], {
  url: "/runs/run%20private/review-evidence", authorization: "Bearer token", cookie: "session=abc", ignored: undefined,
});
assert.equal((await client.loadRunReviewAccess({ runId: "unauthorized", request: { headers: {} } })).status, "unauthorized");
assert.equal((await client.loadRunReviewAccess({ runId: "missing", request: { headers: {} } })).status, "missing");

await close(api);
assert.throws(() => createRunReviewApiClient({ apiOrigin: "file:///tmp/api" }), /HTTP or HTTPS/u);

/** Starts a server on an ephemeral loopback port. */
function listen(server) {
  return new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
}

/** Returns the assigned loopback origin. */
function originOf(server) {
  return `http://127.0.0.1:${server.address().port}`;
}

/** Stops one listening server. */
function close(server) {
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
