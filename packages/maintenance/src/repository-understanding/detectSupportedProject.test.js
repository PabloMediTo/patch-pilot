import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { detectSupportedProject } from "./index.js";

const testRoot = await mkdtemp(join(tmpdir(), "patch-pilot-detection-"));

try {
  const typeScriptDirectory = join(testRoot, "typescript");
  await mkdir(typeScriptDirectory);
  await writeFile(join(typeScriptDirectory, "tsconfig.json"), "{}", "utf8");
  await writeFile(
    join(typeScriptDirectory, "package.json"),
    JSON.stringify({ scripts: { test: "node --test" }, devDependencies: { typescript: "1.0.0" } }),
    "utf8",
  );
  assert.deepEqual(await detectSupportedProject({ workspaceDirectory: typeScriptDirectory }), {
    status: "supported",
    language: "typescript",
    workspaceDirectory: typeScriptDirectory,
    command: { executable: "npm", args: ["test"] },
  });

  const pythonDirectory = join(testRoot, "python");
  await mkdir(pythonDirectory);
  await writeFile(join(pythonDirectory, "pyproject.toml"), "[tool.pytest.ini_options]\n", "utf8");
  assert.deepEqual(await detectSupportedProject({ workspaceDirectory: pythonDirectory }), {
    status: "supported",
    language: "python",
    workspaceDirectory: pythonDirectory,
    command: { executable: "python", args: ["-m", "pytest"] },
  });

  const ambiguousDirectory = join(testRoot, "ambiguous");
  await mkdir(ambiguousDirectory);
  await writeFile(join(ambiguousDirectory, "tsconfig.json"), "{}", "utf8");
  await writeFile(join(ambiguousDirectory, "package.json"), JSON.stringify({ scripts: { test: "test" } }), "utf8");
  await writeFile(join(ambiguousDirectory, "requirements.txt"), "pytest==9.0.0\n", "utf8");
  assert.deepEqual(await detectSupportedProject({ workspaceDirectory: ambiguousDirectory }), {
    status: "unsupported",
    reason: "ambiguous-project",
  });
} finally {
  await rm(testRoot, { force: true, recursive: true });
}
