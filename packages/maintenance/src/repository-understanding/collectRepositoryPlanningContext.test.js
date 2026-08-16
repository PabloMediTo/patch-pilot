import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { collectRepositoryPlanningContext } from "./index.js";

const testRoot = await mkdtemp(join(tmpdir(), "patch-pilot-context-"));

try {
  await mkdir(join(testRoot, "src"));
  await mkdir(join(testRoot, "tests"));
  await mkdir(join(testRoot, "node_modules"));
  await writeFile(join(testRoot, "README.md"), "Small addition service.", "utf8");
  await writeFile(join(testRoot, "package.json"), "{\"scripts\":{\"test\":\"node --test\"}}", "utf8");
  await writeFile(join(testRoot, "src", "math.ts"), "export const add = () => 'wrong addition';", "utf8");
  await writeFile(join(testRoot, "tests", "math.test.ts"), "// addition regression", "utf8");
  await writeFile(join(testRoot, ".env.production"), "SECRET=hidden", "utf8");
  await writeFile(join(testRoot, "private.pem"), "secret-key", "utf8");
  await writeFile(join(testRoot, "node_modules", "ignored.js"), "addition", "utf8");
  await writeFile(join(testRoot, "src", "large.ts"), "x".repeat(32_769), "utf8");

  const result = await collectRepositoryPlanningContext({ workspaceDirectory: testRoot,
    issue: { title: "Fix addition", context: "The addition result is wrong." } });
  assert.equal(result.status, "ready");
  assert.ok(result.totalBytes <= 131_072);
  assert.ok(result.relevantFiles.length <= 12);
  assert.equal(result.relevantFiles[0].path, "README.md");
  assert.ok(result.relevantFiles.some(({ path }) => path === "src/math.ts"));
  assert.ok(result.relevantFiles.some(({ path }) => path === "tests/math.test.ts"));
  assert.ok(!result.relevantFiles.some(({ path }) => path.includes(".env")));
  assert.ok(!result.relevantFiles.some(({ path }) => path.includes("node_modules")));
  assert.ok(!result.relevantFiles.some(({ path }) => path === "src/large.ts"));
  assert.ok(Object.isFrozen(result.relevantFiles));

  const crowdedDirectory = join(testRoot, "crowded");
  await mkdir(crowdedDirectory);
  await Promise.all(Array.from({ length: 201 }, (_, index) =>
    writeFile(join(crowdedDirectory, `file-${index}.ts`), "source", "utf8")));
  assert.deepEqual(await collectRepositoryPlanningContext({ workspaceDirectory: crowdedDirectory,
    issue: { title: "Fix source", context: "A source file is incorrect." } }),
  { status: "unsupported", reason: "planning-context-candidate-limit" });

  const wideDirectory = join(testRoot, "wide");
  await mkdir(wideDirectory);
  for (let index = 0; index < 1001; index += 1) {
    await writeFile(join(wideDirectory, `ignored-${index}.bin`), "binary candidate", "utf8");
  }
  assert.deepEqual(await collectRepositoryPlanningContext({ workspaceDirectory: wideDirectory,
    issue: { title: "Fix source", context: "A source file is incorrect." } }),
  { status: "unsupported", reason: "planning-context-entry-limit" });
} finally {
  await rm(testRoot, { force: true, recursive: true });
}
