import { execFile } from "node:child_process";
import { access, cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { createSandboxCommandExecutor } from "@patch-pilot/maintainer-worker";

import { verifySandboxIntegration } from "./sandbox-integration.mjs";

const executeFile = promisify(execFile);
const fixtureDirectory = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "sandbox-node");
const integrationRoot = await mkdtemp(join(tmpdir(), "patch-pilot-sandbox-integration-"));
const workspaceDirectory = join(integrationRoot, "workspace");
const containerId = "sandbox-integration";
const containerName = `patch-pilot-${containerId}`;

try {
  await cp(fixtureDirectory, workspaceDirectory, { recursive: true });
  const executeSandbox = createSandboxCommandExecutor({ createId: () => containerId });
  const report = await verifySandboxIntegration({ workspaceDirectory, containerName,
    executeSandbox, hasHostMutation: () => pathExists(join(workspaceDirectory,
      "container-only.txt")), isContainerPresent });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await rm(integrationRoot, { force: true, recursive: true });
}

/** Reports whether one filesystem path exists without changing it. */
async function pathExists(path) {
  try { await access(path); return true; }
  catch { return false; }
}

/** Reports whether Docker still retains the supposedly removed probe container. */
async function isContainerPresent(name) {
  try {
    await executeFile("docker", ["container", "inspect", name], {
      encoding: "utf8", maxBuffer: 65_536, timeout: 30_000, windowsHide: true });
    return true;
  } catch { return false; }
}
