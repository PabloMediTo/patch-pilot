import assert from "node:assert/strict";

import { runPilotReadinessCommand } from "./pilot-readiness-command.mjs";

let invocation;
const result = await runPilotReadinessCommand("docker", ["compose", "config", "--quiet"],
  { cwd: "C:/pilot" }, async (executable, args, options) => {
    invocation = { executable, args, options };
    return { stdout: "", stderr: "" };
  });

assert.deepEqual(result, { stdout: "", stderr: "" });
assert.deepEqual(invocation, {
  executable: "docker",
  args: ["compose", "config", "--quiet"],
  options: {
    cwd: "C:/pilot",
    windowsHide: true,
    shell: false,
    timeout: 10_000,
    maxBuffer: 65_536,
    killSignal: "SIGKILL",
  },
});
assert.throws(() => runPilotReadinessCommand("docker", ["version"], { cwd: " " }),
  /exact Docker argument vector/u);
assert.throws(() => runPilotReadinessCommand("powershell", [], { cwd: "C:/pilot" }),
  /exact Docker argument vector/u);
