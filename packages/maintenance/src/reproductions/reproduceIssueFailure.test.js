import assert from "node:assert/strict";

import { reproduceIssueFailure } from "./index.js";

const project = Object.freeze({
  status: "supported",
  language: "typescript",
  workspaceDirectory: "C:/workspace",
  command: Object.freeze({ executable: "npm", args: Object.freeze(["test"]) }),
});

const reproduced = await reproduceIssueFailure({
  project,
  expectedFailure: "expected 2 but received 3",
  executeCommand: async () => ({
    exitCode: 1,
    stdout: "",
    stderr: "AssertionError: expected 2 but received 3",
    durationMs: 120,
    hasTimedOut: false,
    hasTruncatedOutput: false,
  }),
});
assert.equal(reproduced.status, "reproduced");
assert.equal(reproduced.evidence.exitCode, 1);

const differentFailure = await reproduceIssueFailure({
  project,
  expectedFailure: "reported assertion",
  executeCommand: async () => ({
    exitCode: 1,
    stdout: "",
    stderr: "dependency import failed",
    durationMs: 80,
    hasTimedOut: false,
    hasTruncatedOutput: false,
  }),
});
assert.equal(differentFailure.status, "different-failure");

const notReproduced = await reproduceIssueFailure({
  project,
  expectedFailure: "reported assertion",
  executeCommand: async () => ({
    exitCode: 0,
    stdout: "all tests passed",
    stderr: "",
    durationMs: 60,
    hasTimedOut: false,
    hasTruncatedOutput: false,
  }),
});
assert.equal(notReproduced.status, "not-reproduced");

const truncated = await reproduceIssueFailure({
  project,
  expectedFailure: "reported assertion",
  executeCommand: async () => ({
    exitCode: 1,
    stdout: "reported assertion",
    stderr: "",
    durationMs: 50,
    hasTimedOut: false,
    hasTruncatedOutput: true,
  }),
});
assert.deepEqual(
  { status: truncated.status, reason: truncated.reason },
  { status: "execution-failed", reason: "output-truncated" },
);
