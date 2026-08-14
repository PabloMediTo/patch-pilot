import { relative } from "node:path";

const RUNTIME_IMAGES = Object.freeze({
  npm: "node:24.18.0-bookworm-slim",
  python: "python:3.13.14-slim-bookworm",
});

/**
 * Runs one canonical specification in an isolated, size-limited Docker layer.
 *
 * @param {{ spec: object, executeDocker: Function, createContainerName: Function }} input Spec and bounded Docker CLI ports.
 * @returns {Promise<object>} Isolated command evidence.
 * @throws {Error} When container preparation fails.
 */
export async function runInDockerSandbox(input) {
  assertDockerInput(input);
  const name = input.createContainerName();
  const image = RUNTIME_IMAGES[input.spec.executable];
  const createResult = await input.executeDocker({
    args: createContainerArgs(input.spec, name, image),
    timeoutMs: 60_000,
    maxOutputBytes: input.spec.limits.maxOutputBytes,
  });
  assertDockerStep(createResult, "create");

  try {
    const copyResult = await input.executeDocker({
      args: ["cp", `${input.spec.workspaceDirectory}/.`, `${name}:/workspace`],
      timeoutMs: 120_000,
      maxOutputBytes: input.spec.limits.maxOutputBytes,
    });
    assertDockerStep(copyResult, "copy");
    return await input.executeDocker({
      args: ["start", "--attach", name],
      timeoutMs: input.spec.limits.timeoutMs,
      maxOutputBytes: input.spec.limits.maxOutputBytes,
    });
  } finally {
    await input.executeDocker({ args: ["rm", "--force", name], timeoutMs: 30_000, maxOutputBytes: 65_536 });
  }
}

/** Builds canonical Docker create arguments. */
function createContainerArgs(spec, name, image) {
  const child = relative(spec.workspaceDirectory, spec.cwd).replaceAll("\\", "/");
  const cwd = child === "" ? "/workspace" : `/workspace/${child}`;
  return [
    "create", "--name", name, "--network", "none",
    "--cpus", String(spec.limits.cpuCount), "--memory", String(spec.limits.memoryBytes),
    "--storage-opt", `size=${spec.limits.diskBytes}`, "--pids-limit", "256",
    "--cap-drop", "ALL", "--security-opt", "no-new-privileges=true",
    "--workdir", cwd, image, spec.executable, ...spec.args,
  ];
}

/** Validates Docker adapter input. */
function assertDockerInput(input) {
  if (RUNTIME_IMAGES[input?.spec?.executable] === undefined
    || typeof input?.executeDocker !== "function"
    || typeof input?.createContainerName !== "function") {
    throw new Error("Docker sandbox requires a canonical spec and bounded CLI ports.");
  }
}

/** Requires successful Docker preparation evidence. */
function assertDockerStep(result, step) {
  if (result?.exitCode !== 0 || result.hasTimedOut || result.hasTruncatedOutput) {
    throw new Error(`Docker sandbox ${step} failed.`);
  }
}
