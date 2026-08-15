import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

import { applyUnifiedDiff } from "./applyUnifiedDiff.js";

const FULL_REVISION = /^[0-9a-f]{40}$/u;
const EVIDENCE_HASH = /^[0-9a-f]{64}$/u;
const REPOSITORY = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/u;
const MAX_CHANGED_FILES = 10;
const COMMIT_IDENTITY = Object.freeze({ name: "Patch Pilot", email: "patch-pilot@users.noreply.github.com" });

/**
 * Creates a safe publisher for the exact approved text diff through GitHub Git objects.
 *
 * @param {{ requestGitHub: Function }} ports Authenticated GitHub REST port.
 * @returns {Function} Deterministic commit-publication operation.
 */
export function createGitHubCommitPublisher(ports) {
  if (typeof ports?.requestGitHub !== "function") {
    throw new Error("GitHub commit publisher requires an authenticated REST port.");
  }
  return async function publishCommit(request) {
    const intent = createCommitIntent(request);
    const base = await loadBaseCommit(ports.requestGitHub, intent);
    const tree = await loadBaseTree(ports.requestGitHub, intent, base.treeRevision);
    const baseFiles = await loadChangedFiles(ports.requestGitHub, intent, tree);
    const changes = applyUnifiedDiff(intent.sourceDiff, baseFiles);
    assertExactChangedPaths(intent.changedPaths, changes);
    const treeRevision = await createTree(ports.requestGitHub,
      { intent, baseTree: base.treeRevision, changes });
    return createCommit(ports.requestGitHub, intent, treeRevision);
  };
}

/** Validates and normalizes the complete deterministic commit intent. */
function createCommitIntent(request) {
  const approvedAt = new Date(request?.approvedAt);
  const changedPaths = parseChangedPaths(request?.sourceDiff);
  const actualDiffHash = typeof request?.sourceDiff === "string"
    ? createHash("sha256").update(request.sourceDiff, "utf8").digest("hex") : null;
  const hasBoundedUniquePaths = changedPaths.length > 0 && changedPaths.length <= MAX_CHANGED_FILES
    && new Set(changedPaths).size === changedPaths.length;
  if (!Number.isInteger(request?.installationId) || request.installationId <= 0
    || !REPOSITORY.test(request?.repository) || !FULL_REVISION.test(request?.baseRevision)
    || !EVIDENCE_HASH.test(request?.diffHash) || actualDiffHash !== request.diffHash
    || !hasBoundedUniquePaths
    || typeof request?.runId !== "string" || request.runId.trim() === ""
    || Number.isNaN(approvedAt.valueOf())) {
    throw new Error("GitHub commit publication requires exact approved delivery intent.");
  }
  return Object.freeze({ installationId: request.installationId, repository: request.repository,
    baseRevision: request.baseRevision, diffHash: request.diffHash, sourceDiff: request.sourceDiff,
    runId: request.runId, approvedAt: approvedAt.toISOString(), changedPaths });
}

/** Derives unique changed paths without trusting a caller-supplied file list. */
function parseChangedPaths(sourceDiff) {
  if (typeof sourceDiff !== "string") return Object.freeze([]);
  const paths = [...sourceDiff.matchAll(/^diff --git a\/(\S+) b\/\1$/gmu)].map((match) => match[1]);
  return Object.freeze(paths);
}

/** Loads and validates the immutable parent commit and its root tree. */
async function loadBaseCommit(requestGitHub, intent) {
  const response = await requestGitHub(createRequest({ intent, method: "GET",
    suffix: `/git/commits/${intent.baseRevision}` }));
  if (response.statusCode !== 200 || response.body?.sha !== intent.baseRevision
    || !FULL_REVISION.test(response.body?.tree?.sha)) {
    throw createGitHubError("read the approved base commit", response.statusCode);
  }
  return Object.freeze({ treeRevision: response.body.tree.sha });
}

/** Loads the complete base tree required to resolve exact changed blobs. */
async function loadBaseTree(requestGitHub, intent, treeRevision) {
  const response = await requestGitHub(createRequest({ intent, method: "GET",
    suffix: `/git/trees/${treeRevision}`, query: Object.freeze({ recursive: "1" }) }));
  if (response.statusCode !== 200 || response.body?.sha !== treeRevision
    || response.body?.truncated !== false || !Array.isArray(response.body?.tree)) {
    throw createGitHubError("read the complete approved base tree", response.statusCode);
  }
  return new Map(response.body.tree.map((entry) => [entry.path, entry]));
}

/** Reads UTF-8 content for each changed base file while retaining file modes. */
async function loadChangedFiles(requestGitHub, intent, tree) {
  const files = new Map();
  for (const path of intent.changedPaths) {
    const entry = tree.get(path);
    if (entry === undefined) continue;
    if (entry.type !== "blob" || !FULL_REVISION.test(entry.sha)) {
      throw new Error("Approved diff targets a non-file Git object.");
    }
    const response = await requestGitHub(createRequest({ intent, method: "GET",
      suffix: `/git/blobs/${entry.sha}` }));
    if (response.statusCode !== 200 || response.body?.sha !== entry.sha
      || response.body?.encoding !== "base64" || typeof response.body?.content !== "string") {
      throw createGitHubError("read an approved base blob", response.statusCode);
    }
    files.set(path, Object.freeze({ content: decodeUtf8Blob(response.body.content), mode: entry.mode }));
  }
  return files;
}

/** Decodes base64 and rejects binary or invalid UTF-8 content. */
function decodeUtf8Blob(content) {
  const encoded = content.replaceAll("\n", "");
  const bytes = Buffer.from(encoded, "base64");
  const text = bytes.toString("utf8");
  const hasCanonicalBase64 = bytes.toString("base64").replace(/=+$/u, "")
    === encoded.replace(/=+$/u, "");
  if (!hasCanonicalBase64 || text.includes("\0") || !Buffer.from(text, "utf8").equals(bytes)) {
    throw new Error("Commit publication supports only UTF-8 text files.");
  }
  return text;
}

/** Creates a tree based on the exact parent tree and changed file entries. */
async function createTree(requestGitHub, input) {
  const tree = input.changes.map((change) => Object.freeze({ path: change.path, mode: change.mode,
    type: "blob", ...(change.content === null ? { sha: null } : { content: change.content }) }));
  const response = await requestGitHub(createRequest({ intent: input.intent, method: "POST",
    suffix: "/git/trees", body: Object.freeze({ base_tree: input.baseTree, tree }) }));
  if (response.statusCode !== 201 || !FULL_REVISION.test(response.body?.sha)
    || response.body.sha === input.baseTree) {
    throw createGitHubError("create the approved Git tree", response.statusCode);
  }
  return response.body.sha;
}

/** Creates and validates one deterministic child commit of the approved base. */
async function createCommit(requestGitHub, intent, treeRevision) {
  const identity = Object.freeze({ ...COMMIT_IDENTITY, date: intent.approvedAt });
  const body = Object.freeze({ message: createCommitMessage(intent), tree: treeRevision,
    parents: Object.freeze([intent.baseRevision]), author: identity, committer: identity });
  const response = await requestGitHub(createRequest({ intent, method: "POST",
    suffix: "/git/commits", body }));
  const hasExpectedParent = response.body?.parents?.length === 1
    && response.body.parents[0]?.sha === intent.baseRevision;
  if (response.statusCode !== 201 || !FULL_REVISION.test(response.body?.sha)
    || response.body?.tree?.sha !== treeRevision || !hasExpectedParent) {
    throw createGitHubError("create the approved commit", response.statusCode);
  }
  return Object.freeze({ headRevision: response.body.sha });
}

/** Creates a stable audit-friendly message without source content. */
function createCommitMessage(intent) {
  const runHash = createHash("sha256").update(intent.runId, "utf8").digest("hex");
  return `Patch Pilot approved fix\n\nRun-SHA256: ${runHash}\nDiff-SHA256: ${intent.diffHash}`;
}

/** Builds one repository Git-database request. */
function createRequest(input) {
  const match = REPOSITORY.exec(input.intent.repository);
  return Object.freeze({ installationId: input.intent.installationId, method: input.method,
    path: `/repos/${encodeURIComponent(match[1])}/${encodeURIComponent(match[2])}${input.suffix}`,
    ...(input.query === undefined ? {} : { query: input.query }),
    ...(input.body === undefined ? {} : { body: input.body }) });
}

/** Confirms the parser applied the same unique path set derived at the boundary. */
function assertExactChangedPaths(expected, changes) {
  const actual = changes.map(({ path }) => path);
  if (expected.length === 0 || expected.length !== actual.length
    || expected.some((path, index) => path !== actual[index])) {
    throw new Error("Approved diff path set changed during commit publication.");
  }
}

/** Creates a stable provider failure without returning response content. */
function createGitHubError(operation, statusCode) {
  return new Error(`GitHub could not ${operation}; status ${String(statusCode)}.`);
}
