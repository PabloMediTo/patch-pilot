import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { generateKeyPairSync, verify } from "node:crypto";

import { createGitHubAppRequest } from "./index.js";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const privatePem = privateKey.export({ type: "pkcs8", format: "pem" });
let now = new Date("2026-08-15T12:00:00.000Z");
let tokenNumber = 0;
const calls = [];
const requestGitHub = createGitHubAppRequest({ appId: 123, privateKey: privatePem,
  permissions: { contents: "write", pull_requests: "write" },
  clock: () => now, fetchImpl: async (url, init) => {
    calls.push({ url: url.toString(), init });
    if (url.pathname.includes("/access_tokens")) {
      tokenNumber += 1;
      return jsonResponse(201, { token: `installation-${tokenNumber}`,
        expires_at: new Date(now.valueOf() + 3_600_000).toISOString() });
    }
    return jsonResponse(200, { ok: true });
  } });

const first = await requestGitHub({ installationId: 17, method: "GET",
  path: "/repos/octo/example/pulls", query: { state: "all", base: "main" } });
assert.deepEqual(first, { statusCode: 200, body: { ok: true } });
assert.equal(calls.length, 2);
assert.equal(calls[0].url, "https://api.github.com/app/installations/17/access_tokens");
assert.deepEqual(JSON.parse(calls[0].init.body), { repositories: ["example"],
  permissions: { contents: "write", pull_requests: "write" } });
const jwt = calls[0].init.headers.authorization.slice("Bearer ".length);
const [encodedHeader, encodedPayload, encodedSignature] = jwt.split(".");
assert.deepEqual(decodeJwtPart(encodedHeader), { alg: "RS256", typ: "JWT" });
const initialSeconds = Math.floor(new Date("2026-08-15T12:00:00.000Z").valueOf() / 1000);
assert.deepEqual(decodeJwtPart(encodedPayload),
  { iat: initialSeconds - 60, exp: initialSeconds + 540, iss: "123" });
assert.equal(verify("RSA-SHA256", Buffer.from(`${encodedHeader}.${encodedPayload}`), publicKey,
  Buffer.from(encodedSignature, "base64url")), true);
assert.equal(calls[1].init.headers.authorization, "Bearer installation-1");
assert.equal(calls[1].init.headers["x-github-api-version"], "2026-03-10");
assert.match(calls[1].url, /state=all&base=main$/u);

await requestGitHub({ installationId: 17, method: "POST",
  path: "/repos/octo/example/git/refs", body: { ref: "refs/heads/fix" } });
assert.equal(tokenNumber, 1);
assert.equal(calls.at(-1).init.body, JSON.stringify({ ref: "refs/heads/fix" }));

now = new Date("2026-08-15T12:59:30.000Z");
await requestGitHub({ installationId: 17, method: "GET", path: "/repos/octo/example/pulls" });
assert.equal(tokenNumber, 2);

await assert.rejects(requestGitHub({ installationId: 17, method: "DELETE",
  path: "/repos/octo/example/pulls/84" }), /only installation repository GET or POST/u);

const boundedRequest = createGitHubAppRequest({ appId: 123, privateKey: privatePem,
  permissions: { contents: "write", pull_requests: "write" },
  maxResponseBytes: 8, fetchImpl: async () => jsonResponse(201,
    { token: "too-large", expires_at: "2026-08-15T13:00:00.000Z" }) });
await assert.rejects(boundedRequest({ installationId: 17, method: "GET",
  path: "/repos/octo/example/pulls" }), /byte limit/u);

let releaseToken;
let markTokenStarted;
let concurrentTokenCalls = 0;
const tokenStarted = new Promise((resolve) => { markTokenStarted = resolve; });
const tokenGate = new Promise((resolve) => { releaseToken = resolve; });
const concurrentRequest = createGitHubAppRequest({ appId: 123, privateKey: privatePem,
  permissions: { contents: "write", pull_requests: "write" },
  fetchImpl: async (url) => {
    if (url.pathname.includes("/access_tokens")) {
      concurrentTokenCalls += 1;
      markTokenStarted();
      await tokenGate;
      return jsonResponse(201, { token: "shared-token",
        expires_at: new Date(Date.now() + 3_600_000).toISOString() });
    }
    return jsonResponse(200, { ok: true });
  } });
const concurrentInput = { installationId: 23, method: "GET", path: "/repos/octo/example/pulls" };
const concurrentFirst = concurrentRequest(concurrentInput);
const concurrentSecond = concurrentRequest(concurrentInput);
await tokenStarted;
releaseToken();
await Promise.all([concurrentFirst, concurrentSecond]);
assert.equal(concurrentTokenCalls, 1);

/** Creates one real streaming Fetch response for bounded-reader tests. */
function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status,
    headers: { "content-type": "application/json" } });
}

/** Decodes one JWT JSON section for claim assertions. */
function decodeJwtPart(part) {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}
