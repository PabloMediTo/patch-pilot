const EVIDENCE_PREFIX = "PATCH_PILOT_SANDBOX_EVIDENCE:";
const EXPECTED_MEMORY_BYTES = 2_147_483_648;
const EXPECTED_DISK_BYTES = 5_368_709_120;
const EXPECTED_PIDS = 256;

/**
 * Executes and verifies one real canonical sandbox probe without exposing raw command output.
 *
 * @param {{ workspaceDirectory: string, containerName: string, executeSandbox: Function, hasHostMutation: Function, isContainerPresent: Function }} input Workspace and controlled runtime ports.
 * @returns {Promise<object>} Sanitized live-proof report.
 */
export async function verifySandboxIntegration(input) {
  assertInput(input);
  const result = await input.executeSandbox({ executable: "npm", args: ["test"],
    cwd: input.workspaceDirectory, workspaceDirectory: input.workspaceDirectory });
  const evidence = parseProbeEvidence(result);
  assertProbeEvidence(evidence);
  const [hasHostMutation, isContainerPresent] = await Promise.all([
    input.hasHostMutation(), input.isContainerPresent(input.containerName),
  ]);
  if (hasHostMutation || isContainerPresent) {
    throw new Error("Sandbox integration detected host mutation or retained container state.");
  }
  return Object.freeze({ status: "passed", checks: Object.freeze([
    createPassedCheck("cpu-limit"), createPassedCheck("memory-limit"),
    createPassedCheck("disk-limit"), createPassedCheck("pid-limit"),
    createPassedCheck("network-disabled"), createPassedCheck("capabilities-dropped"),
    createPassedCheck("no-new-privileges"), createPassedCheck("workspace-isolated"),
    createPassedCheck("container-cleanup"),
  ]) });
}

/** Requires exact runner ports and identities. */
function assertInput(input) {
  if (typeof input?.workspaceDirectory !== "string" || input.workspaceDirectory.trim() === ""
    || typeof input.containerName !== "string" || input.containerName.trim() === ""
    || typeof input.executeSandbox !== "function" || typeof input.hasHostMutation !== "function"
    || typeof input.isContainerPresent !== "function") {
    throw new Error("Sandbox integration requires workspace, container, and runtime ports.");
  }
}

/** Extracts bounded structured evidence from npm's command output. */
function parseProbeEvidence(result) {
  if (result?.exitCode !== 0 || result.hasTimedOut || result.hasTruncatedOutput
    || typeof result.stdout !== "string") {
    throw new Error("Sandbox integration command did not complete with bounded success evidence.");
  }
  const line = result.stdout.split(/\r?\n/u)
    .find((candidate) => candidate.startsWith(EVIDENCE_PREFIX));
  if (line === undefined) throw new Error("Sandbox integration evidence marker is missing.");
  try { return JSON.parse(line.slice(EVIDENCE_PREFIX.length)); }
  catch { throw new Error("Sandbox integration evidence is malformed."); }
}

/** Validates every runtime invariant emitted from inside the live container. */
function assertProbeEvidence(evidence) {
  const hasExpectedEvidence = evidence?.workingDirectory === "/workspace"
    && evidence.cpuCount === 2
    && evidence.memoryBytes === EXPECTED_MEMORY_BYTES
    && Number.isFinite(evidence.diskBytes) && evidence.diskBytes > 0
    && evidence.diskBytes <= EXPECTED_DISK_BYTES
    && evidence.pidsLimit === EXPECTED_PIDS
    && evidence.networkBlocked === true
    && evidence.capabilitiesDropped === true
    && evidence.noNewPrivileges === true
    && evidence.workspaceMarker === "copied";
  if (!hasExpectedEvidence) {
    throw new Error("Sandbox integration evidence does not satisfy the canonical limits.");
  }
}

/** Creates one sanitized successful check entry. */
function createPassedCheck(name) {
  return Object.freeze({ name, status: "passed" });
}
