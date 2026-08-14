import assert from "node:assert/strict";
import { join } from "node:path";

import { createSandboxCommandExecutor } from "./index.js";

const workspaceDirectory = join("C:", "workspaces", "repository-1");
const calls = [];
const executeCommand = createSandboxCommandExecutor({
  createId: () => "run-1",
  now: () => 10,
  execFileProcess: (file, args, options, callback) => {
    calls.push({ file, args, options });
    callback(null, args[0] === "start" ? "test output" : "", "");
  },
});

const result = await executeCommand({
  workspaceDirectory,
  cwd: workspaceDirectory,
  executable: "npm",
  args: ["test"],
});

assert.equal(result.exitCode, 0);
assert.equal(result.stdout, "test output");
assert.deepEqual(calls.map(({ args }) => args[0]), ["create", "cp", "start", "rm"]);
assert.ok(calls[0].args.includes("patch-pilot-run-1"));
assert.ok(calls.every(({ file }) => file === "docker"));

const blocked = await executeCommand({
  workspaceDirectory,
  cwd: workspaceDirectory,
  executable: "npm",
  args: ["install"],
});
assert.deepEqual(blocked, { status: "blocked", reasons: ["command-not-allowed"] });
assert.equal(calls.length, 4);
