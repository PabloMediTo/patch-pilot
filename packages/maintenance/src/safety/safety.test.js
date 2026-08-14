import assert from "node:assert/strict";
import { join } from "node:path";

import {
  assessChangeSafety,
  assessExecutionSafety,
  createMvpSafetyPolicy,
  executeWithMvpSafety,
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
