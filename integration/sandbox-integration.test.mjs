import assert from "node:assert/strict";

import { verifySandboxIntegration } from "./sandbox-integration.mjs";

const canonicalEvidence = { workingDirectory: "/workspace", cpuCount: 2,
  memoryBytes: 2_147_483_648, diskBytes: 5_368_709_120, pidsLimit: 256,
  networkBlocked: true, capabilitiesDropped: true, noNewPrivileges: true,
  workspaceMarker: "copied" };
const requests = [];
const report = await verifySandboxIntegration({ workspaceDirectory: "controlled-workspace",
  containerName: "patch-pilot-integration", executeSandbox: async (request) => {
    requests.push(request);
    return createResult(canonicalEvidence);
  }, hasHostMutation: async () => false, isContainerPresent: async () => false });

assert.equal(report.status, "passed");
assert.equal(report.checks.length, 9);
assert.deepEqual(requests, [{ executable: "npm", args: ["test"],
  cwd: "controlled-workspace", workspaceDirectory: "controlled-workspace" }]);
assert.equal(JSON.stringify(report).includes("controlled-workspace"), false);

await assert.rejects(verifySandboxIntegration({ workspaceDirectory: "controlled-workspace",
  containerName: "patch-pilot-integration",
  executeSandbox: async () => createResult({ ...canonicalEvidence, networkBlocked: false }),
  hasHostMutation: async () => false, isContainerPresent: async () => false }),
/does not satisfy the canonical limits/u);

await assert.rejects(verifySandboxIntegration({ workspaceDirectory: "controlled-workspace",
  containerName: "patch-pilot-integration",
  executeSandbox: async () => createResult(canonicalEvidence),
  hasHostMutation: async () => true, isContainerPresent: async () => false }),
/host mutation or retained container state/u);

await assert.rejects(verifySandboxIntegration({ workspaceDirectory: "controlled-workspace",
  containerName: "patch-pilot-integration",
  executeSandbox: async () => ({ exitCode: 0, stdout: "missing marker", stderr: "",
    durationMs: 1, hasTimedOut: false, hasTruncatedOutput: false }),
  hasHostMutation: async () => false, isContainerPresent: async () => false }),
/evidence marker is missing/u);

/** Creates one successful sandbox result containing structured probe evidence. */
function createResult(evidence) {
  return { exitCode: 0,
    stdout: `npm test\nPATCH_PILOT_SANDBOX_EVIDENCE:${JSON.stringify(evidence)}\n`,
    stderr: "", durationMs: 100, hasTimedOut: false, hasTruncatedOutput: false };
}
