import assert from "node:assert/strict";

import { createGitHubDeliveryAdapter } from "./index.js";

const headRevision = "d".repeat(40);
const branchRequest = Object.freeze({ runId: "run-1", installationId: 17,
  repository: "octo/example", branchName: `patch-pilot/${"a".repeat(24)}`,
  baseRevision: "b".repeat(40), diffHash: "c".repeat(64), sourceDiff: "+fixed" });
const pullRequest = Object.freeze({ installationId: 17, repository: "octo/example",
  headBranch: branchRequest.branchName, baseBranch: "main", title: "Fix bug",
  body: "Verified fix\n\nFixes #42", issueNumber: 42, draft: true });

const createCalls = [];
const createAdapter = createGitHubDeliveryAdapter({
  publishCommit: async (request) => { createCalls.push({ type: "commit", request });
    return { headRevision }; },
  requestGitHub: async (request) => {
    createCalls.push({ type: "rest", request });
    if (request.method === "GET") return { statusCode: 404, body: null };
    return { statusCode: 201, body: createRef(headRevision) };
  },
});
assert.deepEqual(await createAdapter.publishBranch(branchRequest), { headRevision });
assert.deepEqual(createCalls.map(({ type }) => type), ["commit", "rest", "rest"]);
assert.equal(createCalls[1].request.path,
  `/repos/octo/example/git/ref/heads/${branchRequest.branchName}`);
assert.deepEqual(createCalls[2].request.body,
  { ref: `refs/heads/${branchRequest.branchName}`, sha: headRevision });

let postCalls = 0;
const replayAdapter = createGitHubDeliveryAdapter({
  publishCommit: async () => ({ headRevision }),
  requestGitHub: async (request) => {
    if (request.method === "POST") postCalls += 1;
    return { statusCode: 200, body: createRef(headRevision) };
  },
});
assert.deepEqual(await replayAdapter.publishBranch(branchRequest), { headRevision });
assert.equal(postCalls, 0);

const raceResponses = [{ statusCode: 404 }, { statusCode: 422 },
  { statusCode: 200, body: createRef(headRevision) }];
const raceAdapter = createGitHubDeliveryAdapter({ publishCommit: async () => ({ headRevision }),
  requestGitHub: async () => raceResponses.shift() });
assert.deepEqual(await raceAdapter.publishBranch(branchRequest), { headRevision });

const conflictAdapter = createGitHubDeliveryAdapter({
  publishCommit: async () => ({ headRevision }),
  requestGitHub: async () => ({ statusCode: 200, body: createRef("e".repeat(40)) }),
});
await assert.rejects(conflictAdapter.publishBranch(branchRequest), /different commit/u);

const prCalls = [];
const prAdapter = createGitHubDeliveryAdapter({ publishCommit: async () => ({ headRevision }),
  requestGitHub: async (request) => {
    prCalls.push(request);
    return request.method === "GET" ? { statusCode: 200, body: [] }
      : { statusCode: 201, body: createPullRequest() };
  } });
assert.deepEqual(await prAdapter.ensureDraftPullRequest(pullRequest),
  { number: 84, url: "https://github.com/octo/example/pull/84", draft: true });
assert.deepEqual(prCalls[0].query,
  { state: "all", head: `octo:${pullRequest.headBranch}`, base: "main" });
assert.deepEqual(prCalls[1].body,
  { title: "Fix bug", head: pullRequest.headBranch, base: "main",
    body: pullRequest.body, draft: true });

let prCreateCalls = 0;
const existingPrAdapter = createGitHubDeliveryAdapter({ publishCommit: async () => ({ headRevision }),
  requestGitHub: async (request) => { if (request.method === "POST") prCreateCalls += 1;
    return { statusCode: 200, body: [createPullRequest()] }; } });
assert.equal((await existingPrAdapter.ensureDraftPullRequest(pullRequest)).number, 84);
assert.equal(prCreateCalls, 0);

const prRaceResponses = [{ statusCode: 200, body: [] }, { statusCode: 422 },
  { statusCode: 200, body: [createPullRequest()] }];
const prRaceAdapter = createGitHubDeliveryAdapter({ publishCommit: async () => ({ headRevision }),
  requestGitHub: async () => prRaceResponses.shift() });
assert.equal((await prRaceAdapter.ensureDraftPullRequest(pullRequest)).number, 84);

const unsafePrAdapter = createGitHubDeliveryAdapter({ publishCommit: async () => ({ headRevision }),
  requestGitHub: async () => ({ statusCode: 200,
    body: [{ ...createPullRequest(), draft: false }] }) });
await assert.rejects(unsafePrAdapter.ensureDraftPullRequest(pullRequest), /does not match/u);

/** Creates one GitHub reference response. */
function createRef(revision) {
  return { ref: `refs/heads/${branchRequest.branchName}`,
    object: { type: "commit", sha: revision } };
}

/** Creates one exact open draft pull-request response. */
function createPullRequest() {
  return { number: 84, html_url: "https://github.com/octo/example/pull/84",
    state: "open", draft: true, head: { ref: pullRequest.headBranch }, base: { ref: "main" } };
}
