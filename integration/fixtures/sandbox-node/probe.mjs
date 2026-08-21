import assert from "node:assert/strict";
import { readFileSync, statfsSync, writeFileSync } from "node:fs";
import process from "node:process";

const cpuCount = readCpuCount();
const memoryBytes = Number(readFirst([
  "/sys/fs/cgroup/memory.max", "/sys/fs/cgroup/memory/memory.limit_in_bytes",
]));
const pidsLimit = Number(readFirst([
  "/sys/fs/cgroup/pids.max", "/sys/fs/cgroup/pids/pids.max",
]));
const processStatus = readFileSync("/proc/self/status", "utf8");
const filesystem = statfsSync("/workspace");
const diskBytes = Number(filesystem.bsize) * Number(filesystem.blocks);
const networkBlocked = await isNetworkBlocked();
const capabilitiesDropped = /^CapEff:\s+0+$/mu.test(processStatus);
const noNewPrivileges = /^NoNewPrivs:\s+1$/mu.test(processStatus);
const workspaceMarker = readFileSync("/workspace/workspace-marker.txt", "utf8").trim();

assert.equal(process.cwd(), "/workspace");
assert.equal(cpuCount, 2);
assert.equal(memoryBytes, 2_147_483_648);
assert.equal(pidsLimit, 256);
assert.equal(networkBlocked, true);
assert.equal(capabilitiesDropped, true);
assert.equal(noNewPrivileges, true);
assert.equal(workspaceMarker, "copied");
assert.ok(diskBytes > 0 && diskBytes <= 5_368_709_120);
writeFileSync("/workspace/container-only.txt", "isolated\n", "utf8");

process.stdout.write(`PATCH_PILOT_SANDBOX_EVIDENCE:${JSON.stringify({
  workingDirectory: process.cwd(), cpuCount, memoryBytes, diskBytes, pidsLimit,
  networkBlocked, capabilitiesDropped, noNewPrivileges, workspaceMarker,
})}\n`);

/** Reads the effective cgroup CPU quota as a processor count. */
function readCpuCount() {
  const unified = readOptional("/sys/fs/cgroup/cpu.max");
  if (unified !== null) {
    const [quota, period] = unified.split(/\s+/u).map(Number);
    return quota / period;
  }
  const quota = Number(readFirst(["/sys/fs/cgroup/cpu/cpu.cfs_quota_us"]));
  const period = Number(readFirst(["/sys/fs/cgroup/cpu/cpu.cfs_period_us"]));
  return quota / period;
}

/** Reads the first available cgroup control file. */
function readFirst(paths) {
  for (const path of paths) {
    const value = readOptional(path);
    if (value !== null) return value;
  }
  throw new Error("Required cgroup evidence is unavailable.");
}

/** Reads one optional UTF-8 file without leaking errors into evidence. */
function readOptional(path) {
  try { return readFileSync(path, "utf8").trim(); }
  catch { return null; }
}

/** Proves that the container cannot establish an outbound HTTPS request. */
async function isNetworkBlocked() {
  try {
    await globalThis.fetch("https://example.com",
      { signal: globalThis.AbortSignal.timeout(2_000) });
    return false;
  } catch { return true; }
}
