import assert from "node:assert/strict";

import { createBoundedChangeProposal } from "./createBoundedChangeProposal.js";

const baseInput = Object.freeze({
  issue: Object.freeze({ title: "Return the normalized account name" }),
  reproduction: Object.freeze({ status: "reproduced", evidence: Object.freeze({ exitCode: 1 }) }),
  repositoryContext: Object.freeze({ relevantFiles: Object.freeze(["src/account.js"]) }),
});

await runTest("creates a bounded plan and independently measured source diff", async () => {
  const observed = {};
  const result = await createBoundedChangeProposal({
    ...baseInput,
    generatePlan: async (request) => {
      observed.planRequest = request;
      return {
        summary: "Normalize account names at the domain boundary.",
        steps: [{
          description: "Normalize the returned account name.",
          rationale: "The reproduction shows mixed casing escapes the boundary.",
          files: ["src/account.js"],
        }],
      };
    },
    generateDiff: async (request) => {
      observed.diffRequest = request;
      return {
        unifiedDiff: [
          "diff --git a/src/account.js b/src/account.js",
          "--- a/src/account.js",
          "+++ b/src/account.js",
          "@@ -1 +1 @@",
          "-export const name = input.name;",
          "+export const name = input.name.toLowerCase();",
        ].join("\n"),
      };
    },
  });

  assert.equal(result.status, "ready");
  assert.equal(result.plan.version, 1);
  assert.deepEqual(result.sourceDiff.changes, [
    { path: "src/account.js", addedLines: 1, deletedLines: 1 },
  ]);
  assert.deepEqual(result.safety, { status: "allowed", reasons: [] });
  assert.deepEqual(observed.planRequest.limits, { maxSteps: 8, maxFiles: 10 });
  assert.equal(observed.diffRequest.plan, result.plan);
  assert.ok(Object.isFrozen(result));
});

await runTest("rejects planning before the reported failure is reproduced", async () => {
  await assert.rejects(
    createBoundedChangeProposal({
      ...baseInput,
      reproduction: { status: "different-failure" },
      generatePlan: async () => ({}),
      generateDiff: async () => ({}),
    }),
    /requires a reproduced issue/u,
  );
});

await runTest("creates an explicitly versioned revised proposal", async () => {
  const result = await createBoundedChangeProposal({ ...baseInput, planVersion: 2,
    generatePlan: async () => ({ summary: "Revise normalization.", steps: [{
      description: "Revise source.", rationale: "Verification found a regression.",
      files: ["src/account.js"],
    }] }), generateDiff: async () => ({ unifiedDiff: [
      "diff --git a/src/account.js b/src/account.js", "@@ -1 +1 @@", "-old", "+revised",
    ].join("\n") }) });
  assert.equal(result.plan.version, 2);
});

await runTest("rejects a diff that touches a file not justified by the plan", async () => {
  await assert.rejects(
    createBoundedChangeProposal({
      ...baseInput,
      generatePlan: async () => ({
        summary: "Change one source file.",
        steps: [{ description: "Fix source.", rationale: "It owns the bug.", files: ["src/account.js"] }],
      }),
      generateDiff: async () => ({
        unifiedDiff: [
          "diff --git a/src/other.js b/src/other.js",
          "--- a/src/other.js",
          "+++ b/src/other.js",
          "@@ -1 +1 @@",
          "-false",
          "+true",
        ].join("\n"),
      }),
    }),
    /exactly the files justified/u,
  );
});

await runTest("rejects redirected paths and unsafe file modes", async () => {
  const generatePlan = async () => ({ summary: "Change source.", steps: [{
    description: "Fix source.", rationale: "It owns the failure.", files: ["src/account.js"],
  }] });
  for (const metadata of ["+++ b/src/other.js", "new file mode 120000",
    "rename to src/other.js", "GIT binary patch"]) {
    await assert.rejects(createBoundedChangeProposal({ ...baseInput, generatePlan,
      generateDiff: async () => ({ unifiedDiff: [
        "diff --git a/src/account.js b/src/account.js", "--- a/src/account.js", metadata,
        "@@ -1 +1 @@", "-old", "+fixed",
      ].join("\n") }) }), /unsupported or mismatched file metadata/u);
  }
});

await runTest("blocks a correctly planned diff that violates the canonical change policy", async () => {
  const result = await createBoundedChangeProposal({
    ...baseInput,
    generatePlan: async () => ({
      summary: "Change a forbidden dependency manifest.",
      steps: [{ description: "Update manifest.", rationale: "Generated request.", files: ["package.json"] }],
    }),
    generateDiff: async () => ({
      unifiedDiff: [
        "diff --git a/package.json b/package.json",
        "--- a/package.json",
        "+++ b/package.json",
        "@@ -1 +1 @@",
        "-{}",
        "+{\"scripts\":{}}",
      ].join("\n"),
    }),
  });

  assert.equal(result.status, "blocked");
  assert.deepEqual(result.safety.reasons, ["forbidden-path"]);
});

await runTest("rejects plans with duplicate file ownership or more than eight steps", async () => {
  const duplicateStep = {
    description: "Change source.",
    rationale: "The source owns the behavior.",
    files: ["src/account.js"],
  };

  await assert.rejects(
    createBoundedChangeProposal({
      ...baseInput,
      generatePlan: async () => ({ summary: "Duplicate ownership.", steps: [duplicateStep, duplicateStep] }),
      generateDiff: async () => ({}),
    }),
    /exactly one implementation step/u,
  );

  await assert.rejects(
    createBoundedChangeProposal({
      ...baseInput,
      generatePlan: async () => ({
        summary: "Too many steps.",
        steps: Array.from({ length: 9 }, (_, index) => ({
          description: `Step ${index + 1}`,
          rationale: "Generated rationale.",
          files: [`src/file-${index + 1}.js`],
        })),
      }),
      generateDiff: async () => ({}),
    }),
    /exceeds eight steps/u,
  );

  await assert.rejects(
    createBoundedChangeProposal({ ...baseInput,
      generatePlan: async () => ({ summary: "Too many files.", steps: [{
        description: "Change too many files.", rationale: "Generated rationale.",
        files: Array.from({ length: 11 }, (_, index) => `src/file-${index + 1}.js`),
      }] }), generateDiff: async () => ({}) }),
    /at most ten files/u,
  );
});

/**
 * Executes one named assertion group in the package's direct test-file style.
 *
 * @param {string} name Human-readable assertion group name.
 * @param {Function} assertionGroup Assertions to execute.
 * @returns {Promise<void>} Completion after all assertions pass.
 */
async function runTest(name, assertionGroup) {
  assert.notEqual(name.trim(), "");
  await assertionGroup();
}
