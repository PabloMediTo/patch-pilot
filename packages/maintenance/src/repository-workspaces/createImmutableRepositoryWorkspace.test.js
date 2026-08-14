import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import {
  createImmutableRepositoryWorkspace,
  removeRepositoryWorkspace,
} from "./index.js";

const execFileAsync = promisify(execFile);
const testRoot = join(tmpdir(), `patch-pilot-repository-workspace-${Date.now()}`);
const sourceDirectory = join(testRoot, "source");
const workspaceRoot = join(testRoot, "workspaces");

try {
  await mkdir(sourceDirectory, { recursive: true });
  await runTestGit(sourceDirectory, ["init", "--quiet"]);
  await runTestGit(sourceDirectory, ["config", "user.name", "Patch Pilot Test"]);
  await runTestGit(sourceDirectory, ["config", "user.email", "test@patch-pilot.invalid"]);
  await writeFile(join(sourceDirectory, "example.txt"), "immutable\n", "utf8");
  await runTestGit(sourceDirectory, ["add", "example.txt"]);
  await runTestGit(sourceDirectory, ["commit", "--quiet", "-m", "fixture"]);
  const baseRevision = (await runTestGit(sourceDirectory, ["rev-parse", "HEAD"])).trim();

  const workspace = await createImmutableRepositoryWorkspace({
    rootDirectory: workspaceRoot,
    repositoryUrl: sourceDirectory,
    baseRevision,
  });

  assert.equal(workspace.baseRevision, baseRevision);
  assert.equal(
    (await runTestGit(workspace.workspaceDirectory, ["rev-parse", "HEAD"])).trim(),
    baseRevision,
  );
  assert.equal(
    (await runTestGit(workspace.workspaceDirectory, ["rev-parse", "--abbrev-ref", "HEAD"])).trim(),
    "HEAD",
  );
  assert.equal(
    (await readFile(join(workspace.workspaceDirectory, "example.txt"), "utf8")).trim(),
    "immutable",
  );
  assert.doesNotMatch(
    await readFile(join(workspace.workspaceDirectory, ".git", "config"), "utf8"),
    /remote "origin"/u,
  );
  await assert.rejects(
    removeRepositoryWorkspace({
      rootDirectory: workspaceRoot,
      workspaceDirectory: sourceDirectory,
    }),
    /Refusing to remove an unrecognized repository workspace/u,
  );

  await removeRepositoryWorkspace({
    rootDirectory: workspaceRoot,
    workspaceDirectory: workspace.workspaceDirectory,
  });
  assert.deepEqual(await readdir(workspaceRoot), []);

  await assert.rejects(
    createImmutableRepositoryWorkspace({
      rootDirectory: workspaceRoot,
      repositoryUrl: sourceDirectory,
      baseRevision: "not-a-full-revision",
    }),
    /full lowercase commit SHA/u,
  );
  await assert.rejects(
    createImmutableRepositoryWorkspace({
      rootDirectory: workspaceRoot,
      repositoryUrl: "https://token@example.com/owner/repository.git",
      baseRevision,
    }),
    /credential-free repository URL/u,
  );
  assert.deepEqual(await readdir(workspaceRoot), []);
} finally {
  await rm(testRoot, { force: true, recursive: true });
}

/**
 * Executes Git for the local integration fixture.
 *
 * @param {string} cwd Working directory.
 * @param {string[]} args Git argument vector.
 * @returns {Promise<string>} Standard output.
 */
async function runTestGit(cwd, args) {
  const result = await execFileAsync("git", args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
  return result.stdout;
}
