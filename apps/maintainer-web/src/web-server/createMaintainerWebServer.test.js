import assert from "node:assert/strict";
import { createServer, request } from "node:http";

import { createMaintainerWebServer } from "./index.js";

const received = [];
const api = createServer((incoming, response) => {
  const chunks = [];
  incoming.on("data", (chunk) => chunks.push(chunk));
  incoming.on("end", () => {
    received.push({ method: incoming.method, url: incoming.url, body: Buffer.concat(chunks).toString() });
    if (incoming.url.endsWith("/review-evidence")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(createEvidence()));
      return;
    }
    response.writeHead(201, { "content-type": "application/json" });
    response.end('{"status":"created"}');
  });
});
await listen(api);

const web = createMaintainerWebServer({ apiOrigin: originOf(api) });
await listen(web);

const review = await exchange(web, { method: "GET", path: "/runs/run-1/review" });
assert.equal(review.statusCode, 200);
assert.match(review.body, /run-1/u);
assert.deepEqual(received, [{ method: "GET", url: "/runs/run-1/review-evidence", body: "" }]);

const approval = await exchange(web, {
  method: "POST", path: "/runs/run-1/approval/approve", body: "reason=looks-good",
});
assert.deepEqual(approval, { statusCode: 201, body: '{"status":"created"}' });
assert.deepEqual(received[1], { method: "POST", url: "/runs/run-1/approval/approve", body: "reason=looks-good" });

await Promise.all([close(web), close(api)]);

/** Starts a server on an ephemeral loopback port. */
function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
}

/** Returns the loopback origin assigned to a listening server. */
function originOf(server) {
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

/** Sends one request and captures its complete finite response. */
function exchange(server, input) {
  return new Promise((resolve, reject) => {
    const outgoing = request(`${originOf(server)}${input.path}`, { method: input.method }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({ statusCode: response.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    outgoing.once("error", reject);
    outgoing.end(input.body);
  });
}

/** Stops one listening server. */
function close(server) {
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

/** Creates enough persisted evidence to render a review. */
function createEvidence() {
  return {
    run: { id: "run-1", status: "awaiting-approval" }, timeline: [],
    proposal: { plan: { steps: [{ path: "src/fix.ts", description: "Fix" }] }, diff: "+safe" },
    verification: { status: "passed", evidence: { command: { executable: "npm", args: ["test"] },
      exitCode: 0, stdout: "ok", stderr: "", durationMs: 1, hasTimedOut: false, hasTruncatedOutput: false } },
  };
}
