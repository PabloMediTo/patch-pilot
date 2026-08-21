import assert from "node:assert/strict";

import { verifySandboxIntegration } from "./sandbox-integration.mjs";

const canonicalEvidence = { workingDirectory: "/workspace", cpuCount: 2,
  memoryBytes: 2_147_483_648, diskBytes: 5_368_709_120, pidsLimit: 256,
  networkBlocked: true, capabilitiesDropped: true, noNewPrivileges: true,
  workspaceMarker: "copied" };
const requests = [];
const dockerRequests = [];
const report = await verifySandboxIntegration({ workspaceDirectory: "controlled-workspace",
  containerNames: createContainerNames(), executeSandbox: async (request) => {
    requests.push(request);
    return createResult(canonicalEvidence);
  }, executeDocker: createDockerProbeExecutor({ requests: dockerRequests }),
  hasHostMutation: async () => false,
  isContainerPresent: async () => false });

assert.equal(report.status, "passed");
assert.equal(report.checks.length, 13);
assert.deepEqual(requests, [{ executable: "npm", args: ["test"],
  cwd: "controlled-workspace", workspaceDirectory: "controlled-workspace" }]);
assert.deepEqual(dockerRequests.map((request) => ({ command: request.args[1],
  timeoutMs: request.timeoutMs, maxOutputBytes: request.maxOutputBytes })), [
  { command: "create", timeoutMs: 60_000, maxOutputBytes: 65_536 },
  { command: "start", timeoutMs: 30_000, maxOutputBytes: 65_536 },
  { command: "rm", timeoutMs: 30_000, maxOutputBytes: 65_536 },
  { command: "create", timeoutMs: 60_000, maxOutputBytes: 65_536 },
  { command: "start", timeoutMs: 1_000, maxOutputBytes: 65_536 },
  { command: "rm", timeoutMs: 30_000, maxOutputBytes: 65_536 },
]);
assert.deepEqual(dockerRequests[0].args.slice(0, 8), ["container", "create", "--name",
  "patch-pilot-output-integration", "--network", "none",
  "node:24.18.0-bookworm-slim", "node"]);
assert.equal(JSON.stringify(report).includes("controlled-workspace"), false);

await assert.rejects(verifySandboxIntegration({ workspaceDirectory: "controlled-workspace",
  containerNames: createContainerNames(),
  executeSandbox: async () => createResult({ ...canonicalEvidence, networkBlocked: false }),
  executeDocker: createDockerProbeExecutor(), hasHostMutation: async () => false,
  isContainerPresent: async () => false }),
/does not satisfy the canonical limits/u);

await assert.rejects(verifySandboxIntegration({ workspaceDirectory: "controlled-workspace",
  containerNames: createContainerNames(),
  executeSandbox: async () => createResult(canonicalEvidence),
  executeDocker: createDockerProbeExecutor(), hasHostMutation: async () => true,
  isContainerPresent: async () => false }),
/host mutation or retained container state/u);

await assert.rejects(verifySandboxIntegration({ workspaceDirectory: "controlled-workspace",
  containerNames: createContainerNames(),
  executeSandbox: async () => ({ exitCode: 0, stdout: "missing marker", stderr: "",
    durationMs: 1, hasTimedOut: false, hasTruncatedOutput: false }),
  executeDocker: createDockerProbeExecutor(), hasHostMutation: async () => false,
  isContainerPresent: async () => false }),
/evidence marker is missing/u);

await assert.rejects(verifySandboxIntegration({ workspaceDirectory: "controlled-workspace",
  containerNames: createContainerNames(), executeSandbox: async () => createResult(canonicalEvidence),
  executeDocker: createDockerProbeExecutor({ output: "missed" }),
  hasHostMutation: async () => false, isContainerPresent: async () => false }),
/output limit was not enforced/u);

await assert.rejects(verifySandboxIntegration({ workspaceDirectory: "controlled-workspace",
  containerNames: createContainerNames(), executeSandbox: async () => createResult(canonicalEvidence),
  executeDocker: createDockerProbeExecutor({ timeout: "missed" }),
  hasHostMutation: async () => false, isContainerPresent: async () => false }),
/timeout limit was not enforced/u);

const failedCreateRequests = [];
await assert.rejects(verifySandboxIntegration({ workspaceDirectory: "controlled-workspace",
  containerNames: createContainerNames(), executeSandbox: async () => createResult(canonicalEvidence),
  executeDocker: createDockerProbeExecutor({ create: "failed", requests: failedCreateRequests }),
  hasHostMutation: async () => false, isContainerPresent: async () => false }),
/creation failed/u);
assert.deepEqual(failedCreateRequests.slice(0, 2).map(({ args }) => args[1]), ["create", "rm"]);

/** Creates one successful sandbox result containing structured probe evidence. */
function createResult(evidence) {
  return { exitCode: 0,
    stdout: `npm test\nPATCH_PILOT_SANDBOX_EVIDENCE:${JSON.stringify(evidence)}\n`,
    stderr: "", durationMs: 100, hasTimedOut: false, hasTruncatedOutput: false };
}

/** Creates deterministic names for all three live-probe containers. */
function createContainerNames() {
  return { sandbox: "patch-pilot-integration", output: "patch-pilot-output-integration",
    timeout: "patch-pilot-timeout-integration" };
}

/** Creates provider-free Docker evidence for setup, limit, and cleanup requests. */
function createDockerProbeExecutor(overrides = {}) {
  return async (request) => {
    overrides.requests?.push(request);
    const isStart = request.args[1] === "start";
    const isCreate = request.args[1] === "create";
    const name = request.args.at(-1);
    if (isCreate && overrides.create === "failed") {
      return createProcessResult({ exitCode: 1 });
    }
    if (!isStart) return createProcessResult();
    if (name.includes("output")) return overrides.output === "missed"
      ? createProcessResult() : createProcessResult({ hasTruncatedOutput: true, exitCode: -1 });
    return overrides.timeout === "missed"
      ? createProcessResult() : createProcessResult({ hasTimedOut: true, exitCode: -1 });
  };
}

/** Creates one bounded Docker CLI process result. */
function createProcessResult(overrides = {}) {
  return { exitCode: 0, stdout: "", stderr: "", durationMs: 1,
    hasTimedOut: false, hasTruncatedOutput: false, ...overrides };
}
