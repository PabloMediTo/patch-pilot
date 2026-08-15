import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

import { createGitHubCommitPublisher } from "./index.js";

const baseRevision = "a".repeat(40);
const baseTree = "b".repeat(40);
const changedBlob = "c".repeat(40);
const deletedBlob = "d".repeat(40);
const createdTree = "e".repeat(40);
const headRevision = "f".repeat(40);
const sourceDiff = [
  "diff --git a/src/fix.js b/src/fix.js",
  `index ${changedBlob}..${"1".repeat(40)} 100644`,
  "--- a/src/fix.js",
  "+++ b/src/fix.js",
  "@@ -1,2 +1,2 @@",
  "-old",
  "+fixed",
  " keep",
  "diff --git a/src/new.js b/src/new.js",
  "new file mode 100644",
  `index ${"0".repeat(40)}..${"2".repeat(40)}`,
  "--- /dev/null",
  "+++ b/src/new.js",
  "@@ -0,0 +1 @@",
  "+export const added = true;",
  "diff --git a/src/obsolete.js b/src/obsolete.js",
  "deleted file mode 100644",
  `index ${deletedBlob}..${"0".repeat(40)}`,
  "--- a/src/obsolete.js",
  "+++ /dev/null",
  "@@ -1 +0,0 @@",
  "-obsolete",
].join("\n");
const diffHash = createHash("sha256").update(sourceDiff, "utf8").digest("hex");
const request = Object.freeze({ runId: "run-commit-1", installationId: 17,
  repository: "octo/example", baseRevision, diffHash, sourceDiff,
  approvedAt: "2026-08-15T11:55:00.000Z" });

const calls = [];
const publishCommit = createGitHubCommitPublisher({ requestGitHub: createRequestPort(calls) });
assert.deepEqual(await publishCommit(request), { headRevision });
assert.deepEqual(calls.map(({ method, path }) => `${method} ${path}`), [
  `GET /repos/octo/example/git/commits/${baseRevision}`,
  `GET /repos/octo/example/git/trees/${baseTree}`,
  `GET /repos/octo/example/git/blobs/${changedBlob}`,
  `GET /repos/octo/example/git/blobs/${deletedBlob}`,
  "POST /repos/octo/example/git/trees",
  "POST /repos/octo/example/git/commits",
]);
assert.deepEqual(calls[1].query, { recursive: "1" });
assert.deepEqual(calls[4].body, { base_tree: baseTree, tree: [
  { path: "src/fix.js", mode: "100644", type: "blob", content: "fixed\nkeep\n" },
  { path: "src/new.js", mode: "100644", type: "blob", content: "export const added = true;\n" },
  { path: "src/obsolete.js", mode: "100644", type: "blob", sha: null },
] });
assert.deepEqual(calls[5].body.parents, [baseRevision]);
assert.equal(calls[5].body.tree, createdTree);
assert.equal(calls[5].body.author.date, request.approvedAt);
assert.deepEqual(calls[5].body.author, calls[5].body.committer);
assert.match(calls[5].body.message, /^Patch Pilot approved fix\n\nRun-SHA256: [0-9a-f]{64}\n/u);
assert.doesNotMatch(calls[5].body.message, /run-commit-1/u);
assert.match(calls[5].body.message, new RegExp(`Diff-SHA256: ${diffHash}$`, "u"));

const retryCalls = [];
await createGitHubCommitPublisher({ requestGitHub: createRequestPort(retryCalls) })(request);
assert.deepEqual(retryCalls.at(-1).body, calls.at(-1).body);

let invalidCalls = 0;
const guardedPublisher = createGitHubCommitPublisher({ requestGitHub: async () => {
  invalidCalls += 1; return { statusCode: 500 }; } });
await assert.rejects(guardedPublisher({ ...request, diffHash: "9".repeat(64) }), /exact approved/u);
assert.equal(invalidCalls, 0);

const mismatchPort = createRequestPort([], { changedContent: "different\nkeep\n" });
await assert.rejects(createGitHubCommitPublisher({ requestGitHub: mismatchPort })(request),
  /does not apply exactly/u);

const truncatedPort = createRequestPort([], { isTreeTruncated: true });
await assert.rejects(createGitHubCommitPublisher({ requestGitHub: truncatedPort })(request),
  /complete approved base tree/u);

const binaryPort = createRequestPort([], { changedBytes: Buffer.from([0xff, 0xfe]) });
await assert.rejects(createGitHubCommitPublisher({ requestGitHub: binaryPort })(request),
  /UTF-8 text/u);

/** Creates one deterministic GitHub Git-database request port. */
function createRequestPort(recordedCalls, overrides = {}) {
  return async function requestGitHub(call) {
    recordedCalls.push(call);
    if (call.path.endsWith(`/git/commits/${baseRevision}`)) {
      return { statusCode: 200, body: { sha: baseRevision, tree: { sha: baseTree } } };
    }
    if (call.path.endsWith(`/git/trees/${baseTree}`)) {
      return { statusCode: 200, body: { sha: baseTree,
        truncated: overrides.isTreeTruncated ?? false, tree: [
          { path: "src/fix.js", type: "blob", mode: "100644", sha: changedBlob },
          { path: "src/obsolete.js", type: "blob", mode: "100644", sha: deletedBlob },
        ] } };
    }
    if (call.path.endsWith(`/git/blobs/${changedBlob}`)) {
      const bytes = overrides.changedBytes
        ?? Buffer.from(overrides.changedContent ?? "old\nkeep\n", "utf8");
      return createBlob(changedBlob, bytes);
    }
    if (call.path.endsWith(`/git/blobs/${deletedBlob}`)) {
      return createBlob(deletedBlob, Buffer.from("obsolete\n", "utf8"));
    }
    if (call.path.endsWith("/git/trees")) {
      return { statusCode: 201, body: { sha: createdTree } };
    }
    return { statusCode: 201, body: { sha: headRevision, tree: { sha: createdTree },
      parents: [{ sha: baseRevision }] } };
  };
}

/** Creates one base64 Git blob response. */
function createBlob(sha, bytes) {
  return { statusCode: 200, body: { sha, encoding: "base64", content: bytes.toString("base64") } };
}
