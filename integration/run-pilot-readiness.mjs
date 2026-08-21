import { execFile } from "node:child_process";
import process from "node:process";
import { promisify } from "node:util";

import { assessPilotReadiness } from "./pilot-readiness.mjs";

const executeFile = promisify(execFile);
const report = await assessPilotReadiness({ environment: process.env,
  projectDirectory: process.cwd(), runCommand });
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (report.status !== "ready") process.exitCode = 1;

/** Executes an exact argument vector without invoking a shell. */
function runCommand(executable, args, options) {
  return executeFile(executable, args, { ...options, windowsHide: true });
}
