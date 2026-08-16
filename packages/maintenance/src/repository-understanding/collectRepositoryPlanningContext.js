import { lstat, opendir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";

import { assessRepositoryContextPath, createMvpSafetyPolicy } from "../safety/index.js";

const CORE_FILE_SCORES = Object.freeze({
  "AGENTS.md": 100,
  "README.md": 90,
  "package.json": 80,
  "pyproject.toml": 80,
  "pytest.ini": 70,
  "tsconfig.json": 70,
});

/**
 * Collects deterministic bounded text evidence for planning a reproduced issue.
 *
 * @param {{ workspaceDirectory: string, issue: { title: string, context: string } }} input Workspace and immutable issue evidence.
 * @returns {Promise<object>} Ready bounded context or an explicit unsupported result.
 */
export async function collectRepositoryPlanningContext(input) {
  assertInput(input);
  const policy = createMvpSafetyPolicy().repositoryContext;
  const discovery = await discoverCandidatePaths(input.workspaceDirectory, policy);
  if (discovery.status !== "ready") return discovery;
  const tokens = createIssueTokens(input.issue);
  const candidates = (await Promise.all(discovery.paths.map((path) => readCandidate({
    workspaceDirectory: input.workspaceDirectory, path, tokens, policy,
  })))).filter(Boolean);
  const relevantFiles = selectBoundedFiles(candidates, policy);
  if (relevantFiles.length === 0) {
    return Object.freeze({ status: "unsupported", reason: "no-readable-planning-context" });
  }
  const totalBytes = relevantFiles.reduce((total, file) => total + file.byteLength, 0);
  return Object.freeze({ status: "ready", relevantFiles: Object.freeze(relevantFiles),
    totalBytes, candidateCount: discovery.paths.length });
}

/** Discovers allowed regular-file paths without following symbolic links. */
async function discoverCandidatePaths(workspaceDirectory, policy) {
  const directories = [""];
  const paths = [];
  let entryCount = 0;
  while (directories.length > 0) {
    const prefix = directories.shift();
    const result = await readBoundedEntries(join(workspaceDirectory, prefix),
      policy.maxEntries - entryCount);
    if (result.status !== "ready") return result;
    entryCount += result.entries.length;
    const entries = result.entries.toSorted((left, right) => left.name.localeCompare(right.name));
    const candidateLimit = addDiscoveredEntries({ entries, prefix, directories, paths, policy });
    if (candidateLimit !== null) return candidateLimit;
  }
  return Object.freeze({ status: "ready", paths: Object.freeze(paths) });
}

/** Adds one sorted directory batch to the traversal and candidate queues. */
function addDiscoveredEntries(input) {
  for (const entry of input.entries) {
    const path = input.prefix === "" ? entry.name : `${input.prefix}/${entry.name}`;
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory() && isAllowedPath(path, "directory", input.policy)) {
      input.directories.push(path);
    }
    if (entry.isFile() && isAllowedPath(path, "file", input.policy)) input.paths.push(path);
    if (input.paths.length > input.policy.maxCandidates) {
      return Object.freeze({ status: "unsupported", reason: "planning-context-candidate-limit" });
    }
  }
  return null;
}

/** Streams at most the remaining global directory-entry budget. */
async function readBoundedEntries(directory, remainingEntries) {
  const entries = [];
  const handle = await opendir(directory);
  for await (const entry of handle) {
    entries.push(entry);
    if (entries.length > remainingEntries) {
      return Object.freeze({ status: "unsupported", reason: "planning-context-entry-limit" });
    }
  }
  return Object.freeze({ status: "ready", entries: Object.freeze(entries) });
}

/** Reads and scores one bounded non-binary candidate. */
async function readCandidate(input) {
  const absolutePath = join(input.workspaceDirectory, ...input.path.split("/"));
  const metadata = await lstat(absolutePath);
  if (!metadata.isFile() || metadata.size > input.policy.maxFileBytes) return null;
  const buffer = await readFile(absolutePath);
  if (buffer.includes(0)) return null;
  const content = buffer.toString("utf8");
  return Object.freeze({ path: input.path, content, byteLength: buffer.byteLength,
    score: scoreCandidate(input.path, content, input.tokens) });
}

/** Selects the highest-ranked files within count and aggregate byte limits. */
function selectBoundedFiles(candidates, policy) {
  const ranked = candidates.toSorted((left, right) => right.score - left.score
    || left.path.localeCompare(right.path));
  const selected = [];
  let totalBytes = 0;
  for (const candidate of ranked) {
    if (selected.length >= policy.maxFiles) break;
    if (totalBytes + candidate.byteLength > policy.maxTotalBytes) continue;
    selected.push(Object.freeze({ path: candidate.path, content: candidate.content,
      byteLength: candidate.byteLength }));
    totalBytes += candidate.byteLength;
  }
  return selected;
}

/** Scores instructions, manifests, tests, and issue-token matches deterministically. */
function scoreCandidate(path, content, tokens) {
  const lowerPath = path.toLocaleLowerCase("en-US");
  const lowerContent = content.toLocaleLowerCase("en-US");
  const coreScore = CORE_FILE_SCORES[basename(path)] ?? 0;
  const testScore = /(?:^|\/)(?:test|tests|__tests__|spec)(?:\/|\.|$)/u.test(lowerPath) ? 10 : 0;
  const tokenScore = tokens.reduce((score, token) => score
    + (lowerPath.includes(token) ? 20 : 0) + (lowerContent.includes(token) ? 3 : 0), 0);
  return coreScore + testScore + tokenScore;
}

/** Creates a bounded stable token set from immutable issue evidence. */
function createIssueTokens(issue) {
  const source = `${issue.title}\n${issue.context}`.toLocaleLowerCase("en-US");
  const tokens = source.match(/[\p{L}\p{N}_-]+/gu) ?? [];
  return [...new Set(tokens.filter((token) => token.length >= 3))].slice(0, 30);
}

/** Checks a path through the canonical repository-context safety policy. */
function isAllowedPath(path, kind, policy) {
  return assessRepositoryContextPath({ path, kind, policy }).status === "allowed";
}

/** Requires one local workspace and bounded issue evidence. */
function assertInput(input) {
  const hasWorkspace = typeof input?.workspaceDirectory === "string"
    && input.workspaceDirectory.trim() !== "";
  const hasIssue = typeof input?.issue?.title === "string" && input.issue.title.trim() !== ""
    && typeof input?.issue?.context === "string" && input.issue.context.trim() !== "";
  if (!hasWorkspace || !hasIssue) {
    throw new Error("Repository planning context requires a workspace and issue evidence.");
  }
}
