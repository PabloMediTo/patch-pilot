const EVIDENCE_PREFIX = "PATCH_PILOT_SANDBOX_EVIDENCE:";
const EXPECTED_MEMORY_BYTES = 2_147_483_648;
const EXPECTED_DISK_BYTES = 5_368_709_120;
const EXPECTED_PIDS = 256;
const PROCESS_OUTPUT_BYTES = 65_536;
const PROCESS_TIMEOUT_MS = 1_000;
const PROCESS_IMAGE = "node:24.18.0-bookworm-slim";
const CONTAINER_NAME = /^patch-pilot-[a-z0-9][a-z0-9_.-]{0,62}$/u;

/**
 * Executes and verifies one real canonical sandbox probe without exposing raw command output.
 *
 * @param {{ workspaceDirectory: string, containerNames: object, executeSandbox: Function, executeDocker: Function, hasHostMutation: Function, isContainerPresent: Function }} input Workspace and controlled runtime ports.
 * @returns {Promise<object>} Sanitized live-proof report.
 */
export async function verifySandboxIntegration(input) {
  assertInput(input);
  const result = await input.executeSandbox({ executable: "npm", args: ["test"],
    cwd: input.workspaceDirectory, workspaceDirectory: input.workspaceDirectory });
  const evidence = parseProbeEvidence(result);
  assertProbeEvidence(evidence);
  const [hasHostMutation, isContainerPresent] = await Promise.all([
    input.hasHostMutation(), input.isContainerPresent(input.containerNames.sandbox),
  ]);
  if (hasHostMutation || isContainerPresent) {
    throw new Error("Sandbox integration detected host mutation or retained container state.");
  }
  await verifyDockerProcessProbe({ input, kind: "output",
    containerName: input.containerNames.output });
  await verifyDockerProcessProbe({ input, kind: "timeout",
    containerName: input.containerNames.timeout });
  return Object.freeze({ status: "passed", checks: Object.freeze([
    createPassedCheck("cpu-limit"), createPassedCheck("memory-limit"),
    createPassedCheck("disk-limit"), createPassedCheck("pid-limit"),
    createPassedCheck("network-disabled"), createPassedCheck("capabilities-dropped"),
    createPassedCheck("no-new-privileges"), createPassedCheck("workspace-isolated"),
    createPassedCheck("container-cleanup"), createPassedCheck("output-limit"),
    createPassedCheck("output-probe-cleanup"), createPassedCheck("timeout-limit"),
    createPassedCheck("timeout-probe-cleanup"),
  ]) });
}

/** Requires exact runner ports and identities. */
function assertInput(input) {
  const containerNames = ["sandbox", "output", "timeout"]
    .map((key) => input?.containerNames?.[key]);
  const hasContainerNames = containerNames.every((name) =>
    typeof name === "string" && CONTAINER_NAME.test(name));
  const hasDistinctContainerNames = new Set(containerNames).size === containerNames.length;
  if (typeof input?.workspaceDirectory !== "string" || input.workspaceDirectory.trim() === ""
    || !hasContainerNames || !hasDistinctContainerNames
    || typeof input.executeSandbox !== "function" || typeof input.hasHostMutation !== "function"
    || typeof input.executeDocker !== "function" || typeof input.isContainerPresent !== "function") {
    throw new Error("Sandbox integration requires workspace, container, and runtime ports.");
  }
}

/** Verifies one deliberately short Docker CLI timeout or output-bound probe. */
async function verifyDockerProcessProbe(probe) {
  const failures = [];
  try {
    const createResult = await probe.input.executeDocker(createProcessRequest(probe));
    assertProcessSuccess(createResult, "creation");
    const result = await probe.input.executeDocker(createStartRequest(probe));
    assertExpectedProcessLimit(result, probe.kind);
  } catch (error) {
    failures.push(error);
  }
  try {
    const removeResult = await probe.input.executeDocker({
      args: ["container", "rm", "--force", probe.containerName],
      timeoutMs: 30_000, maxOutputBytes: PROCESS_OUTPUT_BYTES,
    });
    assertProcessSuccess(removeResult, "cleanup");
  } catch (error) {
    failures.push(error);
  }
  try {
    if (await probe.input.isContainerPresent(probe.containerName)) {
      throw new Error("Sandbox process-limit probe retained container state.");
    }
  } catch (error) {
    failures.push(error);
  }
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) {
    throw new AggregateError(failures, "Sandbox process-limit probe cleanup failed.");
  }
}

/** Creates the exact bounded Docker create request for one process probe. */
function createProcessRequest(probe) {
  const script = probe.kind === "output"
    ? `process.stdout.write("x".repeat(${PROCESS_OUTPUT_BYTES * 2}))`
    : "setTimeout(() => {}, 60000)";
  return { args: ["container", "create", "--name", probe.containerName,
    "--network", "none", PROCESS_IMAGE, "node", "-e", script],
  timeoutMs: 60_000, maxOutputBytes: PROCESS_OUTPUT_BYTES };
}

/** Creates the short, test-only Docker start request for one process probe. */
function createStartRequest(probe) {
  return { args: ["container", "start", "--attach", probe.containerName],
    timeoutMs: probe.kind === "timeout" ? PROCESS_TIMEOUT_MS : 30_000,
    maxOutputBytes: PROCESS_OUTPUT_BYTES };
}

/** Requires successful setup or cleanup without retaining provider output. */
function assertProcessSuccess(result, phase) {
  if (result?.exitCode !== 0 || result.hasTimedOut || result.hasTruncatedOutput) {
    throw new Error(`Sandbox process-limit probe ${phase} failed.`);
  }
}

/** Requires the live Docker CLI port to classify the intended process bound. */
function assertExpectedProcessLimit(result, kind) {
  const isExpected = kind === "output"
    ? result?.hasTruncatedOutput === true && result.hasTimedOut === false
    : result?.hasTimedOut === true && result.hasTruncatedOutput === false;
  if (!isExpected) throw new Error(`Sandbox ${kind} limit was not enforced.`);
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
