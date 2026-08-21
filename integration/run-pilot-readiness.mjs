import process from "node:process";

import { runPilotReadinessCommand } from "./pilot-readiness-command.mjs";
import { assessPilotReadiness } from "./pilot-readiness.mjs";

const report = await assessPilotReadiness({ environment: process.env,
  projectDirectory: process.cwd(), runCommand: runPilotReadinessCommand });
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (report.status !== "ready") process.exitCode = 1;
