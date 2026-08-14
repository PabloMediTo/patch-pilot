import assert from "node:assert/strict";

import { createDockerCliExecutor } from "./index.js";

let processInvocation;
const moments = [100, 145];
const executeDocker = createDockerCliExecutor({
  now: () => moments.shift(),
  execFileProcess: (file, args, options, callback) => {
    processInvocation = { file, args, options };
    callback(null, "container output", "");
  },
});
const evidence = await executeDocker({
  args: ["start", "--attach", "patch-pilot-run-1"],
  timeoutMs: 600_000,
  maxOutputBytes: 1_048_576,
});

assert.deepEqual(processInvocation, {
  file: "docker",
  args: ["start", "--attach", "patch-pilot-run-1"],
  options: { encoding: "utf8", maxBuffer: 1_048_576, timeout: 600_000, windowsHide: true },
});
assert.deepEqual(evidence, {
  exitCode: 0,
  stdout: "container output",
  stderr: "",
  durationMs: 45,
  hasTimedOut: false,
  hasTruncatedOutput: false,
});

const executeTruncated = createDockerCliExecutor({
  execFileProcess: (_file, _args, _options, callback) => callback(
    Object.assign(new Error("output exceeded"), { code: "ERR_CHILD_PROCESS_STDIO_MAXBUFFER", killed: true }),
    "partial",
    "",
  ),
});
assert.equal((await executeTruncated({ args: ["cp"], timeoutMs: 1, maxOutputBytes: 1 })).hasTruncatedOutput, true);

const executeTimedOut = createDockerCliExecutor({
  execFileProcess: (_file, _args, _options, callback) => callback(
    Object.assign(new Error("timed out"), { killed: true, signal: "SIGTERM" }),
    "",
    "partial error",
  ),
});
const timedOut = await executeTimedOut({ args: ["start"], timeoutMs: 1, maxOutputBytes: 1 });
assert.equal(timedOut.exitCode, -1);
assert.equal(timedOut.hasTimedOut, true);

assert.throws(
  () => createDockerCliExecutor()({ args: "start", timeoutMs: 0, maxOutputBytes: 0 }),
  /requires arguments/u,
);
