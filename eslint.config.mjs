import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import globals from "globals";

import { boundaryConfig } from "./boundaries.config.mjs";
import {
  createArchitectureBoundaryConfig,
  getSourceRoots,
  getTestFiles,
} from "./eslint-boundaries/createArchitectureBoundaryConfig.mjs";
import { localPlugin } from "./eslint-local-rules/index.mjs";

const sourceFiles = boundaryConfig.productionFiles;
const sourceRoots = getSourceRoots(boundaryConfig);
const testFiles = [
  ...getTestFiles(boundaryConfig),
  "**/*.test.js",
  "**/*.test.mjs",
];
const toolingFiles = [
  "*.js",
  "*.mjs",
  ".agents/skills/**/*.js",
  "eslint-boundaries/**/*.mjs",
  "eslint-local-rules/**/*.mjs",
  "examples/**/*.mjs",
];

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/coverage/**",
      "**/.next/**",
      "**/dist/**",
      "**/.turbo/**",
    ],
  },
  {
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: "error",
    },
  },
  js.configs.recommended,
  createArchitectureBoundaryConfig({
    boundaryConfig,
    repoRoot: import.meta.dirname,
  }),
  {
    files: sourceFiles,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      import: importPlugin,
      local: localPlugin,
    },
    settings: {
      "import/resolver": {
        typescript: true,
        node: {
          extensions: [
            ".js",
            ".cjs",
            ".mjs",
            ".jsx",
            ".ts",
            ".cts",
            ".mts",
            ".tsx",
          ],
        },
      },
    },
    rules: {
      "max-lines": [
        "warn",
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
      "max-lines-per-function": [
        "warn",
        { max: 60, skipBlankLines: true, skipComments: true },
      ],
      "max-params": ["warn", { max: 3 }],
      "max-statements": ["warn", { max: 15 }],
      "import/no-cycle": "error",
      "import/no-default-export": "error",
      "local/index-reexports-only": "error",
      "local/main-no-exports": "error",
      "local/no-classes-for-data": "error",
      "local/predicate-boolean-names": "error",
      "local/primary-export-name": "error",
      "local/require-directory-index": ["error", { sourceRoots }],
      "local/require-function-jsdoc": "error",
    },
  },
  {
    files: ["**/*.{ts,cts,mts,tsx}"],
    languageOptions: {
      parser: tsParser,
    },
  },
  {
    files: testFiles,
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "max-lines": "off",
      "max-lines-per-function": "off",
      "max-params": "off",
      "max-statements": "off",
    },
  },
  {
    files: toolingFiles,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      "import/no-cycle": "error",
      "import/no-default-export": "error",
    },
  },
  {
    files: ["eslint.config.mjs"],
    rules: {
      "import/no-default-export": "off",
    },
  },
];
