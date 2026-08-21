import assert from "node:assert/strict";
import { join } from "node:path";

import {
  assessChangeSafety,
  assessExecutionSafety,
  assessRepositoryContextPath,
  createMvpSafetyPolicy,
  executeWithMvpSafety,
  runInDockerSandbox,
} from "./index.js";

const policy = createMvpSafetyPolicy();
const workspaceDirectory = join("C:", "workspaces", "repository-1");
const allowedRequest = {
  workspaceDirectory,
  cwd: workspaceDirectory,
  executable: "npm",
  args: ["test"],
};

assert.deepEqual(assessExecutionSafety({ request: allowedRequest, policy }), {
  status: "allowed",
  reasons: [],
});
assert.deepEqual(
  assessExecutionSafety({
    request: { ...allowedRequest, executable: "powershell", args: ["-Command", "whoami"] },
    policy,
  }),
  { status: "blocked", reasons: ["command-not-allowed"] },
);

assert.deepEqual(assessRepositoryContextPath({ path: "src/fix.ts", kind: "file",
  policy: policy.repositoryContext }), { status: "allowed", reasons: [] });
assert.deepEqual(assessRepositoryContextPath({ path: ".env.production", kind: "file",
  policy: policy.repositoryContext }), { status: "blocked", reasons: ["forbidden-file",
  "unsupported-file-type"] });
assert.equal(assessRepositoryContextPath({ path: "node_modules/pkg/index.js", kind: "file",
  policy: policy.repositoryContext }).status, "blocked");
assert.equal(assessRepositoryContextPath({ path: "../outside.ts", kind: "file",
  policy: policy.repositoryContext }).status, "blocked");
assert.equal(assessRepositoryContextPath({ path: "PRIVATE.PEM", kind: "file",
  policy: policy.repositoryContext }).status, "blocked");
assert.deepEqual(
  assessExecutionSafety({
    request: { ...allowedRequest, cwd: join("C:", "outside") },
    policy,
  }),
  { status: "blocked", reasons: ["cwd-outside-workspace"] },
);

let sandboxCalls = 0;
const sandboxResult = await executeWithMvpSafety({
  request: allowedRequest,
  runInSandbox: async (specification) => {
    sandboxCalls += 1;
    assert.equal(specification.limits.networkAccess, "none");
    assert.equal(specification.filesystemAccess, "workspace-only");
    return { exitCode: 0 };
  },
});
assert.deepEqual(sandboxResult, { exitCode: 0 });

await executeWithMvpSafety({
  request: { ...allowedRequest, executable: "sh", args: ["-c", "env"] },
  runInSandbox: async () => {
    sandboxCalls += 1;
  },
});
assert.equal(sandboxCalls, 1);

assert.deepEqual(
  assessChangeSafety({
    changes: [{ path: "src/fix.ts", addedLines: 4, deletedLines: 2 }],
    policy,
  }),
  { status: "allowed", reasons: [] },
);
assert.deepEqual(
  assessChangeSafety({
    changes: [
      { path: ".env.production", addedLines: 1, deletedLines: 0 },
      { path: "migrations/001.sql", addedLines: 600, deletedLines: 0 },
    ],
    policy,
  }),
  { status: "blocked", reasons: ["too-many-lines", "forbidden-path"] },
);

const dockerCalls = [];
const dockerResult = await runInDockerSandbox({
  spec: {
    cwd: join(workspaceDirectory, "packages", "api"),
    workspaceDirectory,
    executable: "npm",
    args: ["test"],
    limits: policy.execution,
  },
  createContainerName: () => "patch-pilot-run-1",
  executeDocker: async (request) => {
    dockerCalls.push(request);
    return { exitCode: 0, hasTimedOut: false, hasTruncatedOutput: false };
  },
});
assert.equal(dockerResult.exitCode, 0);
assert.deepEqual(dockerCalls.map(({ args }) => args[0]), ["create", "cp", "start", "rm"]);
assert.ok(dockerCalls[0].args.includes("node:24.18.0-bookworm-slim"));
assert.ok(dockerCalls[0].args.includes("size=5368709120"));
assert.ok(dockerCalls[0].args.includes("/workspace/packages/api"));

const cleanupCalls = [];
await assert.rejects(
  runInDockerSandbox({
    spec: { cwd: workspaceDirectory, workspaceDirectory, executable: "python", args: ["-m", "pytest"], limits: policy.execution },
    createContainerName: () => "patch-pilot-run-2",
    executeDocker: async ({ args }) => {
      cleanupCalls.push(args[0]);
      return args[0] === "cp"
        ? { exitCode: 1 }
        : { exitCode: 0, hasTimedOut: false, hasTruncatedOutput: false };
    },
  }),
  /copy failed/u,
);
assert.deepEqual(cleanupCalls, ["create", "cp", "rm"]);

const failedCleanupCalls = [];
await assert.rejects(
  runInDockerSandbox({
    spec: { cwd: workspaceDirectory, workspaceDirectory, executable: "npm",
      args: ["test"], limits: policy.execution },
    createContainerName: () => "patch-pilot-run-3",
    executeDocker: async ({ args }) => {
      failedCleanupCalls.push(args[0]);
      return args[0] === "rm"
        ? { exitCode: 1, hasTimedOut: false, hasTruncatedOutput: false }
        : { exitCode: 0, hasTimedOut: false, hasTruncatedOutput: false };
    },
  }),
  /cleanup failed/u,
);
assert.deepEqual(failedCleanupCalls, ["create", "cp", "start", "rm"]);
