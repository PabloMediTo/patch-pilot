import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { ESLint } from "eslint";

import {
  createArchitectureBoundaryConfig,
  getSourceRoots,
} from "./eslint-boundaries/createArchitectureBoundaryConfig.mjs";
import { validateBoundaryConfig } from "./eslint-boundaries/validateBoundaryConfig.mjs";
import { boundaryConfig as monorepoConfig } from "./examples/monorepo/boundaries.config.mjs";
import { boundaryConfig as singlePackageConfig } from "./examples/single-package/boundaries.config.mjs";

/**
 * Create an isolated repository with files for all example modules.
 *
 * @param {object} config A valid boundary configuration.
 * @returns {{repoRoot: string, cleanup: () => void}} Fixture controls.
 */
function createFixture(config) {
  const repoRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "architecture-boundaries-"),
  );

  for (const workspace of Object.values(config.workspaces)) {
    const sourceRoot = path.join(repoRoot, workspace.path, workspace.sourceRoot);

    for (const moduleName of Object.keys(workspace.modules)) {
      writeFile(sourceRoot, `${moduleName}/index.js`, "export {};\n");
      writeFile(sourceRoot, `${moduleName}/internal.js`, "export {};\n");
      writeFile(sourceRoot, `${moduleName}/helper.test.js`, "export {};\n");
    }

    for (const compositionFile of Object.keys(workspace.compositionFiles)) {
      writeFile(sourceRoot, compositionFile, "export {};\n");
    }
  }

  return {
    repoRoot,
    cleanup() {
      fs.rmSync(repoRoot, { force: true, recursive: true });
    },
  };
}

/**
 * Write a fixture file below a known temporary source root.
 *
 * @param {string} sourceRoot The absolute source root.
 * @param {string} relativePath The relative file path.
 * @param {string} contents File contents.
 * @returns {void}
 */
function writeFile(sourceRoot, relativePath, contents) {
  const filePath = path.join(sourceRoot, relativePath);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

/**
 * Lint one source file against the generated boundary configuration.
 *
 * @param {object} config A valid boundary configuration.
 * @param {string} repoRoot The absolute fixture root.
 * @param {string} relativeFile Repository-relative source file path.
 * @param {string} source Source text to lint.
 * @returns {Promise<import("eslint").ESLint.LintResult>} The lint result.
 */
async function lintSource(config, repoRoot, relativeFile, source) {
  const filePath = path.join(repoRoot, relativeFile);

  writeFile(repoRoot, relativeFile, source);

  const eslint = new ESLint({
    cwd: repoRoot,
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ["**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}"],
        languageOptions: {
          ecmaVersion: "latest",
          sourceType: "module",
        },
      },
      createArchitectureBoundaryConfig({ boundaryConfig: config, repoRoot }),
    ],
  });
  const [result] = await eslint.lintText(source, { filePath });

  return result;
}

/**
 * Assert that a lint result contains a particular boundary-rule failure.
 *
 * @param {import("eslint").ESLint.LintResult} result The lint result.
 * @param {string} ruleId The expected rule identifier.
 * @returns {void}
 */
function assertRuleFailure(result, ruleId) {
  assert.ok(
    result.messages.some((message) => message.ruleId === ruleId),
    `Expected ${ruleId}; received ${JSON.stringify(result.messages)}`,
  );
}

test("both topology examples validate and produce source roots", () => {
  assert.equal(validateBoundaryConfig(singlePackageConfig), singlePackageConfig);
  assert.equal(validateBoundaryConfig(monorepoConfig), monorepoConfig);
  assert.deepEqual(getSourceRoots(singlePackageConfig), ["src"]);
  assert.deepEqual(getSourceRoots(monorepoConfig), [
    "apps/customer-portal/src",
    "packages/commerce/src",
    "packages/generated-api/src",
  ]);
});

test("an empty greenfield monorepo registry validates", () => {
  const greenfieldConfig = structuredClone(monorepoConfig);
  greenfieldConfig.workspaces = {};

  assert.equal(validateBoundaryConfig(greenfieldConfig), greenfieldConfig);
  assert.deepEqual(getSourceRoots(greenfieldConfig), []);
});

test("the registry rejects unknown references, cycles, globs, and vague exceptions", () => {
  const unknownWorkspace = structuredClone(monorepoConfig);
  unknownWorkspace.workspaces.portal.allowedWorkspaceDependencies.push("missing");
  assert.throws(
    () => validateBoundaryConfig(unknownWorkspace),
    /unknown workspace 'missing'/u,
  );

  const moduleCycle = structuredClone(singlePackageConfig);
  moduleCycle.workspaces.application.modules["order-history"]
    .allowedModuleDependencies.push("order-intake");
  assert.throws(
    () => validateBoundaryConfig(moduleCycle),
    /permitted cycle/u,
  );

  const wildcardExternal = structuredClone(singlePackageConfig);
  wildcardExternal.workspaces.application.modules["order-history"]
    .allowedExternalDependencies.push("@vendor/*");
  assert.throws(
    () => validateBoundaryConfig(wildcardExternal),
    /exact external import specifiers/u,
  );

  const unexplainedException = structuredClone(monorepoConfig);
  delete unexplainedException.workspaces["generated-api"].exceptionReason;
  assert.throws(
    () => validateBoundaryConfig(unexplainedException),
    /must explain the concrete technical exception/u,
  );

  const unexplainedModule = structuredClone(monorepoConfig);
  delete unexplainedModule.workspaces["generated-api"].modules.client
    .exceptionReason;
  assert.throws(
    () => validateBoundaryConfig(unexplainedModule),
    /must explain the concrete technical exception/u,
  );
});

test("declared module edges work only through the target public index", async () => {
  const fixture = createFixture(monorepoConfig);
  const sourceFile = "apps/customer-portal/src/checkout/use-order.js";

  try {
    const publicResult = await lintSource(
      monorepoConfig,
      fixture.repoRoot,
      sourceFile,
      'import "../order-tracking/index.js";\n',
    );
    const privateResult = await lintSource(
      monorepoConfig,
      fixture.repoRoot,
      sourceFile,
      'import "../order-tracking/internal.js";\n',
    );

    assert.equal(publicResult.errorCount, 0);
    assertRuleFailure(privateResult, "boundaries/dependencies");
  } finally {
    fixture.cleanup();
  }
});

test("undeclared modules and workspaces are reported as unknown files", async () => {
  const fixture = createFixture(monorepoConfig);

  try {
    const moduleResult = await lintSource(
      monorepoConfig,
      fixture.repoRoot,
      "apps/customer-portal/src/undeclared/example.js",
      "export const value = 1;\n",
    );
    const workspaceResult = await lintSource(
      monorepoConfig,
      fixture.repoRoot,
      "apps/undeclared/src/new-concept/example.js",
      "export const value = 1;\n",
    );

    assertRuleFailure(moduleResult, "boundaries/no-unknown-files");
    assertRuleFailure(workspaceResult, "boundaries/no-unknown-files");
  } finally {
    fixture.cleanup();
  }
});

test("workspace imports require a declared dependency and exact package root", async () => {
  const fixture = createFixture(monorepoConfig);
  const sourceFile = "apps/customer-portal/src/checkout/use-commerce.js";

  try {
    const allowedResult = await lintSource(
      monorepoConfig,
      fixture.repoRoot,
      sourceFile,
      'import "@example/commerce";\n',
    );
    const subpathResult = await lintSource(
      monorepoConfig,
      fixture.repoRoot,
      sourceFile,
      'import "@example/commerce/private.js";\n',
    );
    const undeclaredResult = await lintSource(
      monorepoConfig,
      fixture.repoRoot,
      sourceFile,
      'import "@example/not-declared";\n',
    );

    assert.equal(
      allowedResult.errorCount,
      0,
      JSON.stringify(allowedResult.messages),
    );
    assertRuleFailure(subpathResult, "boundaries/dependencies");
    assertRuleFailure(undeclaredResult, "boundaries/dependencies");
  } finally {
    fixture.cleanup();
  }
});

test("relative imports cannot bypass workspace package interfaces", async () => {
  const fixture = createFixture(monorepoConfig);

  try {
    const result = await lintSource(
      monorepoConfig,
      fixture.repoRoot,
      "apps/customer-portal/src/checkout/use-commerce.js",
      'import "../../../../packages/commerce/src/ordering/index.js";\n',
    );

    assertRuleFailure(result, "boundaries/dependencies");
  } finally {
    fixture.cleanup();
  }
});

test("external and Node.js core dependencies use exact owner allow-lists", async () => {
  const fixture = createFixture(monorepoConfig);
  const sourceFile = "apps/customer-portal/src/checkout/use-provider.js";

  try {
    const externalResult = await lintSource(
      monorepoConfig,
      fixture.repoRoot,
      sourceFile,
      'import "react";\n',
    );
    const arbitraryResult = await lintSource(
      monorepoConfig,
      fixture.repoRoot,
      sourceFile,
      'import "left-pad";\n',
    );
    const coreResult = await lintSource(
      monorepoConfig,
      fixture.repoRoot,
      sourceFile,
      'import "node:fs";\n',
    );

    assert.equal(externalResult.errorCount, 0);
    assertRuleFailure(arbitraryResult, "boundaries/dependencies");
    assertRuleFailure(coreResult, "boundaries/dependencies");
  } finally {
    fixture.cleanup();
  }
});

test("export, require, and dynamic import cannot bypass dependency rules", async () => {
  const fixture = createFixture(monorepoConfig);

  try {
    const result = await lintSource(
      monorepoConfig,
      fixture.repoRoot,
      "apps/customer-portal/src/checkout/use-provider.js",
      [
        'export { value } from "@example/not-declared";',
        'const provider = require("left-pad");',
        'await import("left-pad");',
        "void provider;",
      ].join("\n"),
    );
    const dependencyFailures = result.messages.filter(
      (message) => message.ruleId === "boundaries/dependencies",
    );

    assert.equal(dependencyFailures.length, 3);
  } finally {
    fixture.cleanup();
  }
});

test("production cannot import tests, while tests can use module internals", async () => {
  const fixture = createFixture(monorepoConfig);
  const productionFile = "apps/customer-portal/src/checkout/use-helper.js";
  const testFile = "apps/customer-portal/src/checkout/use-helper.test.js";

  try {
    const productionResult = await lintSource(
      monorepoConfig,
      fixture.repoRoot,
      productionFile,
      'import "./helper.test.js";\n',
    );
    const testResult = await lintSource(
      monorepoConfig,
      fixture.repoRoot,
      testFile,
      'import "./internal.js";\n',
    );

    assertRuleFailure(productionResult, "boundaries/dependencies");
    assert.equal(testResult.errorCount, 0);
  } finally {
    fixture.cleanup();
  }
});

test("single-package composition files use explicit module permissions", async () => {
  const fixture = createFixture(singlePackageConfig);

  try {
    const allowedResult = await lintSource(
      singlePackageConfig,
      fixture.repoRoot,
      "src/main.ts",
      'import "./order-intake/index.js";\n',
    );
    const privateResult = await lintSource(
      singlePackageConfig,
      fixture.repoRoot,
      "src/main.ts",
      'import "./order-intake/internal.js";\n',
    );
    const testResult = await lintSource(
      singlePackageConfig,
      fixture.repoRoot,
      "src/main.ts",
      'import "./order-intake/helper.test.js";\n',
    );
    const providerSubpathResult = await lintSource(
      singlePackageConfig,
      fixture.repoRoot,
      "src/main.ts",
      'import "dotenv/config";\n',
    );
    const otherProviderSubpathResult = await lintSource(
      singlePackageConfig,
      fixture.repoRoot,
      "src/main.ts",
      'import "dotenv/other";\n',
    );

    assert.equal(allowedResult.errorCount, 0);
    assertRuleFailure(privateResult, "boundaries/dependencies");
    assertRuleFailure(testResult, "boundaries/dependencies");
    assert.equal(providerSubpathResult.errorCount, 0);
    assertRuleFailure(otherProviderSubpathResult, "boundaries/dependencies");
  } finally {
    fixture.cleanup();
  }
});

test("tests receive only explicit test provider permissions", async () => {
  const fixture = createFixture(singlePackageConfig);

  try {
    const allowedResult = await lintSource(
      singlePackageConfig,
      fixture.repoRoot,
      "src/order-intake/provider.test.js",
      'import "vitest";\nimport "node:assert/strict";\n',
    );
    const deniedResult = await lintSource(
      singlePackageConfig,
      fixture.repoRoot,
      "src/order-intake/provider.test.js",
      'import "left-pad";\n',
    );

    assert.equal(
      allowedResult.errorCount,
      0,
      JSON.stringify(allowedResult.messages),
    );
    assertRuleFailure(deniedResult, "boundaries/dependencies");
  } finally {
    fixture.cleanup();
  }
});
