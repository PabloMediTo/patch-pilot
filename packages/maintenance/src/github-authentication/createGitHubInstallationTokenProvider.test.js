import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { generateKeyPairSync, verify } from "node:crypto";

import { createGitHubInstallationTokenProvider } from "./index.js";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const privatePem = privateKey.export({ type: "pkcs8", format: "pem" });
let now = new Date("2026-08-21T12:00:00.000Z");
let tokenNumber = 0;
const calls = [];
const getToken = createGitHubInstallationTokenProvider({ appId: 123, privateKey: privatePem,
  permissions: { contents: "read" }, clock: () => now,
  fetchImpl: async (url, init) => {
    calls.push({ url: url.toString(), init });
    tokenNumber += 1;
    return jsonResponse(201, { token: `installation-${tokenNumber}`,
      expires_at: new Date(now.valueOf() + 3_600_000).toISOString() });
  } });

assert.equal(await getToken({ installationId: 17, repository: "octo/example" }),
  "installation-1");
assert.equal(calls[0].url, "https://api.github.com/app/installations/17/access_tokens");
assert.deepEqual(JSON.parse(calls[0].init.body), { repositories: ["example"],
  permissions: { contents: "read" } });
const jwt = calls[0].init.headers.authorization.slice("Bearer ".length);
const [encodedHeader, encodedPayload, encodedSignature] = jwt.split(".");
assert.deepEqual(decodeJwtPart(encodedHeader), { alg: "RS256", typ: "JWT" });
const initialSeconds = Math.floor(now.valueOf() / 1000);
assert.deepEqual(decodeJwtPart(encodedPayload),
  { iat: initialSeconds - 60, exp: initialSeconds + 540, iss: "123" });
assert.equal(verify("RSA-SHA256", Buffer.from(`${encodedHeader}.${encodedPayload}`), publicKey,
  Buffer.from(encodedSignature, "base64url")), true);

assert.equal(await getToken({ installationId: 17, repository: "octo/example" }),
  "installation-1");
assert.equal(tokenNumber, 1);
now = new Date("2026-08-21T12:59:30.000Z");
assert.equal(await getToken({ installationId: 17, repository: "octo/example" }),
  "installation-2");
assert.equal(tokenNumber, 2);

let releaseToken;
let markTokenStarted;
let concurrentCalls = 0;
const tokenStarted = new Promise((resolve) => { markTokenStarted = resolve; });
const tokenGate = new Promise((resolve) => { releaseToken = resolve; });
const concurrentProvider = createGitHubInstallationTokenProvider({ appId: 123,
  privateKey: privatePem, permissions: { contents: "read" },
  fetchImpl: async () => {
    concurrentCalls += 1;
    markTokenStarted();
    await tokenGate;
    return jsonResponse(201, { token: "shared-token",
      expires_at: new Date(Date.now() + 3_600_000).toISOString() });
  } });
const concurrentInput = { installationId: 23, repository: "octo/example" };
const first = concurrentProvider(concurrentInput);
const second = concurrentProvider(concurrentInput);
await tokenStarted;
releaseToken();
assert.deepEqual(await Promise.all([first, second]), ["shared-token", "shared-token"]);
assert.equal(concurrentCalls, 1);

assert.throws(() => createGitHubInstallationTokenProvider({ appId: 123,
  privateKey: privatePem, permissions: {} }), /explicit read or write permissions/u);
assert.throws(() => createGitHubInstallationTokenProvider({ appId: 123,
  privateKey: privatePem, permissions: { administration: "write" } }),
  /explicit read or write permissions/u);
await assert.rejects(getToken({ installationId: 17, repository: "invalid" }),
  /installation and repository/u);

/** Creates one real streaming Fetch response for bounded-reader tests. */
function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status,
    headers: { "content-type": "application/json" } });
}

/** Decodes one JWT JSON section for claim assertions. */
function decodeJwtPart(part) {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}
