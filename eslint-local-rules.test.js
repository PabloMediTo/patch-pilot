import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { RuleTester } from "eslint";

import { repoJsRules } from "./eslint-local-rules/repo-js-rules.mjs";
import {
  repoRoot,
  resetReportedDirectories,
} from "./eslint-local-rules/shared.mjs";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

/**
 * Create a temporary workspace file path inside the repository.
 *
 * @param {string} relativeWorkspaceRoot The workspace-root directory.
 * @param {string} fileName The file name to create.
 * @returns {{filePath: string, cleanup: () => void}} The file and cleanup hook.
 */
function createWorkspaceFile(relativeWorkspaceRoot, fileName) {
  const workspaceRoot = path.join(repoRoot, relativeWorkspaceRoot);
  const didCreateWorkspaceRoot = !fs.existsSync(workspaceRoot);

  fs.mkdirSync(workspaceRoot, { recursive: true });

  const directory = fs.mkdtempSync(
    path.join(workspaceRoot, ".tmp-eslint-rules-"),
  );
  const filePath = path.join(directory, fileName);

  fs.writeFileSync(filePath, "export function sample() { return 1; }\n");

  return {
    filePath,
    cleanup() {
      fs.rmSync(directory, { force: true, recursive: true });

      if (didCreateWorkspaceRoot) {
        fs.rmdirSync(workspaceRoot);
      }
    },
  };
}

test("index-reexports-only rejects wildcard re-exports", () => {
  ruleTester.run(
    "local/index-reexports-only",
    repoJsRules["index-reexports-only"],
    {
      valid: [
        {
          code: 'export { createThing } from "./create-thing.js";',
          filename: "apps/web/src/index.js",
        },
      ],
      invalid: [
        {
          code: 'export * from "./create-thing.js";',
          filename: "apps/web/src/index.js",
          errors: [{ messageId: "namedReexportsOnly" }],
        },
      ],
    },
  );
});

test("require-directory-index reports production directories without index interfaces", () => {
  resetReportedDirectories();
  const workspaceFile = createWorkspaceFile("apps", "sample.js");

  try {
    ruleTester.run(
      "local/require-directory-index",
      repoJsRules["require-directory-index"],
      {
        valid: [],
        invalid: [
          {
            code: "export function sample() { return 1; }\n",
            filename: workspaceFile.filePath,
            options: [{ sourceRoots: ["apps"] }],
            errors: [{ messageId: "missingIndex" }],
          },
        ],
      },
    );
  } finally {
    workspaceFile.cleanup();
  }
});

test("require-directory-index accepts configured index extensions", () => {
  resetReportedDirectories();
  const workspaceFile = createWorkspaceFile("apps", "sample.js");
  const indexPath = path.join(path.dirname(workspaceFile.filePath), "index.ts");

  fs.writeFileSync(indexPath, 'export { sample } from "./sample.js";\n');

  try {
    ruleTester.run(
      "local/require-directory-index",
      repoJsRules["require-directory-index"],
      {
        valid: [
          {
            code: "export function sample() { return 1; }\n",
            filename: workspaceFile.filePath,
            options: [{ sourceRoots: ["apps"] }],
          },
        ],
        invalid: [],
      },
    );
  } finally {
    workspaceFile.cleanup();
  }
});

test("require-directory-index supports a single-package src root", () => {
  resetReportedDirectories();
  const sourceFile = createWorkspaceFile("src", "sample.js");

  try {
    ruleTester.run(
      "local/require-directory-index",
      repoJsRules["require-directory-index"],
      {
        valid: [],
        invalid: [
          {
            code: "export function sample() { return 1; }\n",
            filename: sourceFile.filePath,
            options: [{ sourceRoots: ["src"] }],
            errors: [{ messageId: "missingIndex" }],
          },
        ],
      },
    );
  } finally {
    sourceFile.cleanup();
  }
});

test("main-no-exports rejects exported main entrypoints", () => {
  ruleTester.run("local/main-no-exports", repoJsRules["main-no-exports"], {
    valid: [
      {
        code: 'console.log("boot");',
        filename: "apps/web/src/main.js",
      },
    ],
    invalid: [
      {
        code: "export function boot() {}\n",
        filename: "apps/web/src/main.js",
        errors: [{ messageId: "noExports" }],
      },
    ],
  });
});

test("primary-export-name matches kebab-case file names to exported functions", () => {
  ruleTester.run(
    "local/primary-export-name",
    repoJsRules["primary-export-name"],
    {
      valid: [
        {
          code: "export function createSession() {}\n",
          filename:
            "apps/web/src/session-management/create-session/create-session.js",
        },
      ],
      invalid: [
        {
          code: "export function createWebRuntime() {}\n",
          filename: "apps/web/src/runtime.js",
          errors: [{ messageId: "filenameMismatch" }],
        },
      ],
    },
  );
});

test("predicate-boolean-names uses JSDoc boolean returns as the reliable trigger", () => {
  ruleTester.run(
    "local/predicate-boolean-names",
    repoJsRules["predicate-boolean-names"],
    {
      valid: [
        {
          code: [
            "/**",
            " * Return whether a job can run.",
            " *",
            " * @returns {boolean} Whether the job is runnable.",
            " */",
            "export function isJobRunnable() {",
            "  return true;",
            "}",
          ].join("\n"),
          filename: "packages/persistence/src/job-records.js",
        },
      ],
      invalid: [
        {
          code: [
            "/**",
            " * Return whether a job can run.",
            " *",
            " * @returns {boolean} Whether the job is runnable.",
            " */",
            "export function canRetryJob() {",
            "  return true;",
            "}",
          ].join("\n"),
          filename: "packages/persistence/src/job-records.js",
          errors: [{ messageId: "predicateStyle" }],
        },
      ],
    },
  );
});

test("require-function-jsdoc enforces module-scope named function docs", () => {
  ruleTester.run(
    "local/require-function-jsdoc",
    repoJsRules["require-function-jsdoc"],
    {
      valid: [
        {
          code: [
            "/** Create a session shell. */",
            "export function createSession() {",
            "  return null;",
            "}",
          ].join("\n"),
          filename:
            "apps/web/src/session-management/create-session/create-session.js",
        },
      ],
      invalid: [
        {
          code: "export function createSession() { return null; }\n",
          filename:
            "apps/web/src/session-management/create-session/create-session.js",
          errors: [{ messageId: "missingJsdoc" }],
        },
      ],
    },
  );
});

test("no-classes-for-data requires an explicit class exception tag", () => {
  ruleTester.run(
    "local/no-classes-for-data",
    repoJsRules["no-classes-for-data"],
    {
      valid: [
        {
          code: [
            "/**",
            " * @statefulResource",
            " */",
            "export class WorkerConnection {}",
          ].join("\n"),
          filename: "apps/worker/src/worker-connection.js",
        },
      ],
      invalid: [
        {
          code: "export class SessionRecord {}\n",
          filename: "packages/persistence/src/session-record.js",
          errors: [{ messageId: "noClasses" }],
        },
      ],
    },
  );
});

test("require-directory-index test helper cleans up its temp workspace", () => {
  const appsPath = path.join(repoRoot, "apps");
  const tempEntries = fs.existsSync(appsPath)
    ? fs
        .readdirSync(appsPath)
        .filter((entry) => entry.startsWith(".tmp-eslint-rules-"))
    : [];

  assert.deepEqual(tempEntries, []);
});
