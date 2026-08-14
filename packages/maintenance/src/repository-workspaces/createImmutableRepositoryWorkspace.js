import { mkdir, mkdtemp } from "node:fs/promises";
import { join, resolve } from "node:path";
import { URL } from "node:url";

import { removeRepositoryWorkspace } from "./removeRepositoryWorkspace.js";
import { runGit } from "./runGit.js";

/**
 * Creates a disposable checkout whose detached HEAD exactly matches one commit SHA.
 *
 * @param {{ rootDirectory: string, repositoryUrl: string, baseRevision: string }} input Workspace root and immutable repository target.
 * @returns {Promise<{ workspaceDirectory: string, baseRevision: string }>} Verified checkout location and revision.
 * @throws {Error} When inputs, Git operations, or revision verification fail.
 */
export async function createImmutableRepositoryWorkspace(input) {
  assertValidInput(input);

  const rootDirectory = resolve(input.rootDirectory);
  await mkdir(rootDirectory, { recursive: true });
  const workspaceDirectory = await mkdtemp(join(rootDirectory, "repository-"));

  try {
    await checkoutRevision(workspaceDirectory, input);
    return Object.freeze({ workspaceDirectory, baseRevision: input.baseRevision });
  } catch (error) {
    await removeRepositoryWorkspace({ rootDirectory, workspaceDirectory });
    throw error;
  }
}

/**
 * Fetches and verifies one immutable revision without retaining remote credentials.
 *
 * @param {string} workspaceDirectory Generated checkout directory.
 * @param {{ repositoryUrl: string, baseRevision: string }} input Repository target.
 * @returns {Promise<void>}
 * @throws {Error} When the resolved HEAD differs from the requested revision.
 */
async function checkoutRevision(workspaceDirectory, input) {
  await runGit({ cwd: workspaceDirectory, args: ["init", "--quiet"] });
  await runGit({ cwd: workspaceDirectory, args: ["remote", "add", "origin", input.repositoryUrl] });
  await runGit({ cwd: workspaceDirectory, args: ["fetch", "--depth=1", "--no-tags", "origin", input.baseRevision] });
  await runGit({ cwd: workspaceDirectory, args: ["checkout", "--quiet", "--detach", "FETCH_HEAD"] });
  await runGit({ cwd: workspaceDirectory, args: ["remote", "remove", "origin"] });

  const checkedOutRevision = (await runGit({ cwd: workspaceDirectory, args: ["rev-parse", "HEAD"] })).trim();
  if (checkedOutRevision !== input.baseRevision) {
    throw new Error("Checked-out revision does not match the requested base revision.");
  }
}

/**
 * Validates immutable checkout inputs before creating a directory.
 *
 * @param {{ rootDirectory: unknown, repositoryUrl: unknown, baseRevision: unknown }} input Candidate input.
 * @returns {void}
 * @throws {Error} When a required value is missing or the revision is not a full Git object ID.
 */
function assertValidInput(input) {
  const hasRootDirectory = typeof input.rootDirectory === "string" && input.rootDirectory.trim() !== "";
  const hasRepositoryUrl = typeof input.repositoryUrl === "string" && input.repositoryUrl.trim() !== "";
  const hasFullRevision = typeof input.baseRevision === "string" && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(input.baseRevision);
  const hasEmbeddedCredentials = hasEmbeddedUrlCredentials(input.repositoryUrl);

  if (!hasRootDirectory || !hasRepositoryUrl || !hasFullRevision || hasEmbeddedCredentials) {
    throw new Error("Repository workspace requires a root, credential-free repository URL, and full lowercase commit SHA.");
  }
}

/**
 * Checks whether a URL would expose credentials through Git arguments or configuration.
 *
 * @param {unknown} repositoryUrl Candidate repository URL or local path.
 * @returns {boolean} Whether an absolute URL contains a username or password.
 */
function hasEmbeddedUrlCredentials(repositoryUrl) {
  if (typeof repositoryUrl !== "string" || !/^[a-z][a-z0-9+.-]*:\/\//iu.test(repositoryUrl)) {
    return false;
  }

  const parsedUrl = new URL(repositoryUrl);
  return parsedUrl.username !== "" || parsedUrl.password !== "";
}
