import { Buffer } from "node:buffer";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve, sep } from "node:path";

import { runGit } from "./runGit.js";

const FULL_REVISION = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const MAX_DIFF_BYTES = 262_144;

/**
 * Restores a disposable checkout to its immutable base and applies one full source diff.
 *
 * @param {{ rootDirectory: string, workspaceDirectory: string, baseRevision: string, unifiedDiff: string, runGitCommand?: Function }} input Generated workspace and validated proposal evidence.
 * @returns {Promise<object>} Immutable materialization evidence.
 */
export async function materializeRepositoryWorkspaceDiff(input) {
  assertInput(input);
  const rootDirectory = resolve(input.rootDirectory);
  const workspaceDirectory = resolve(input.workspaceDirectory);
  assertGeneratedTarget(rootDirectory, workspaceDirectory);
  const runGitCommand = input.runGitCommand ?? runGit;
  const head = (await runGitCommand({ cwd: workspaceDirectory,
    args: ["rev-parse", "HEAD"] })).trim();
  if (head !== input.baseRevision) {
    throw new Error("Proposal workspace does not match its immutable base revision.");
  }
  await restoreBase(runGitCommand, workspaceDirectory, input.baseRevision);
  await applyDiff(runGitCommand, workspaceDirectory, input.unifiedDiff);
  return Object.freeze({ status: "materialized", baseRevision: input.baseRevision });
}

/** Restores tracked and untracked state before every complete proposal attempt. */
async function restoreBase(runGitCommand, workspaceDirectory, baseRevision) {
  await runGitCommand({ cwd: workspaceDirectory, args: ["reset", "--hard", baseRevision] });
  await runGitCommand({ cwd: workspaceDirectory, args: ["clean", "-fdx"] });
}

/** Checks and applies the diff through a temporary file removed in every outcome. */
async function applyDiff(runGitCommand, workspaceDirectory, unifiedDiff) {
  const temporaryDirectory = await mkdtemp(join(workspaceDirectory, ".patch-pilot-"));
  const patchPath = join(temporaryDirectory, "proposal.diff");
  try {
    await writeFile(patchPath, unifiedDiff.endsWith("\n") ? unifiedDiff : `${unifiedDiff}\n`, "utf8");
    const args = ["apply", "--whitespace=nowarn", patchPath];
    await runGitCommand({ cwd: workspaceDirectory, args: ["apply", "--check", ...args.slice(1)] });
    await runGitCommand({ cwd: workspaceDirectory, args });
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

/** Rejects unbounded or non-disposable materialization requests. */
function assertInput(input) {
  const hasWorkspace = typeof input?.rootDirectory === "string" && input.rootDirectory.trim() !== ""
    && typeof input?.workspaceDirectory === "string"
    && input.workspaceDirectory.trim() !== "";
  const hasDiff = typeof input?.unifiedDiff === "string" && input.unifiedDiff.trim() !== ""
    && !input.unifiedDiff.includes("\0")
    && Buffer.byteLength(input.unifiedDiff, "utf8") <= MAX_DIFF_BYTES;
  if (!hasWorkspace || !FULL_REVISION.test(input?.baseRevision) || !hasDiff
    || (input.runGitCommand !== undefined && typeof input.runGitCommand !== "function")) {
    throw new Error("Proposal materialization requires a bounded diff and immutable workspace base.");
  }
}

/** Confines destructive reset and clean commands to this module's generated children. */
function assertGeneratedTarget(rootDirectory, workspaceDirectory) {
  const hasExpectedParent = workspaceDirectory.startsWith(`${rootDirectory}${sep}`);
  const hasExpectedName = basename(workspaceDirectory).startsWith("repository-");
  if (!hasExpectedParent || !hasExpectedName) {
    throw new Error("Refusing to materialize an unrecognized repository workspace.");
  }
}
