import path from "node:path";

import {
  getLeadingJsdoc,
  hasBooleanJsdoc,
  hasClassExceptionTag,
  hasReportedDirectory,
  indexFilePattern,
  isBooleanName,
  isFunctionLikeVariableDeclarator,
  isProductionSourceFile,
  isSourceCodeDirectory,
  markReportedDirectory,
  normalizeName,
  readDirectoryEntries,
  repoRoot,
} from "./shared.mjs";

const mainFilePattern = /^main\.[cm]?[jt]sx?$/u;
const primaryExportExceptions = new Set(["domain", "index", "main"]);

/**
 * Collect exported function and class options from a top-level program.
 *
 * @param {import("eslint").Rule.Node} program The program node to inspect.
 * @returns {Array<{name: string, node: import("eslint").Rule.Node}>} Export options.
 */
function collectPrimaryExportOptions(program) {
  const declarationNodes = new Map();
  const exportOptions = [];
  let hasNonCandidateExport = false;

  for (const statement of program.body) {
    if (
      (statement.type === "FunctionDeclaration" ||
        statement.type === "ClassDeclaration") &&
      statement.id !== null
    ) {
      declarationNodes.set(statement.id.name, statement);
      continue;
    }

    if (statement.type === "VariableDeclaration") {
      for (const declaration of statement.declarations) {
        if (isFunctionLikeVariableDeclarator(declaration)) {
          declarationNodes.set(declaration.id.name, declaration);
        }
      }
    }
  }

  for (const statement of program.body) {
    if (statement.type === "ExportDefaultDeclaration") {
      hasNonCandidateExport = true;
      continue;
    }

    if (statement.type !== "ExportNamedDeclaration") {
      continue;
    }

    if (statement.source !== null) {
      hasNonCandidateExport = true;
      continue;
    }

    if (
      statement.declaration?.type === "FunctionDeclaration" ||
      statement.declaration?.type === "ClassDeclaration"
    ) {
      exportOptions.push({
        name: statement.declaration.id.name,
        node: statement.declaration,
      });
      continue;
    }

    if (statement.declaration?.type === "VariableDeclaration") {
      for (const declaration of statement.declaration.declarations) {
        if (isFunctionLikeVariableDeclarator(declaration)) {
          exportOptions.push({
            name: declaration.id.name,
            node: declaration,
          });
          continue;
        }

        hasNonCandidateExport = true;
      }
      continue;
    }

    for (const specifier of statement.specifiers) {
      if (
        specifier.type === "ExportSpecifier" &&
        declarationNodes.has(specifier.local.name)
      ) {
        exportOptions.push({
          name: specifier.local.name,
          node: declarationNodes.get(specifier.local.name),
        });
        continue;
      }

      hasNonCandidateExport = true;
    }
  }

  return hasNonCandidateExport ? [] : exportOptions;
}

export const repoJsRules = {
  "index-reexports-only": {
    meta: {
      type: "problem",
      docs: {
        description:
          "Require index files to stay pure explicit interface re-exports.",
      },
      schema: [],
      messages: {
        namedReexportsOnly:
          "index files must only contain explicit named re-exports with a source module.",
      },
    },
    create(context) {
      const filename = context.getFilename();

      if (!indexFilePattern.test(path.basename(filename))) {
        return {};
      }

      return {
        Program(node) {
          for (const statement of node.body) {
            const isAllowedExport =
              statement.type === "ExportNamedDeclaration" &&
              statement.source !== null &&
              statement.declaration === null &&
              statement.specifiers.length > 0;

            if (!isAllowedExport) {
              context.report({
                node: statement,
                messageId: "namedReexportsOnly",
              });
            }
          }
        },
      };
    },
  },
  "require-directory-index": {
    meta: {
      type: "problem",
      docs: {
        description:
          "Require every source directory with production files to expose an index interface.",
      },
      schema: [
        {
          type: "object",
          properties: {
            sourceRoots: {
              type: "array",
              items: { type: "string" },
              minItems: 1,
              uniqueItems: true,
            },
          },
          required: ["sourceRoots"],
          additionalProperties: false,
        },
      ],
      messages: {
        missingIndex:
          "Directory '{{directory}}' contains production source files but has no index interface.",
      },
    },
    create(context) {
      return {
        Program(node) {
          const filename = context.getFilename();

          if (filename.startsWith("<")) {
            return;
          }

          const directory = path.dirname(filename);
          const relativeDirectory = path.relative(repoRoot, directory);
          const sourceRoots = context.options[0]?.sourceRoots ?? [];

          if (
            !isSourceCodeDirectory(relativeDirectory, sourceRoots) ||
            hasReportedDirectory(directory)
          ) {
            return;
          }

          const entries = readDirectoryEntries(directory);
          const hasProductionSource = entries.some(
            (entry) => entry.isFile() && isProductionSourceFile(entry.name),
          );

          if (!hasProductionSource) {
            return;
          }

          const hasIndex = entries.some(
            (entry) => entry.isFile() && indexFilePattern.test(entry.name),
          );

          if (hasIndex) {
            return;
          }

          markReportedDirectory(directory);
          context.report({
            node,
            messageId: "missingIndex",
            data: {
              directory: relativeDirectory,
            },
          });
        },
      };
    },
  },
  "main-no-exports": {
    meta: {
      type: "problem",
      docs: {
        description:
          "Keep main entrypoints executable-only by disallowing exports.",
      },
      schema: [],
      messages: {
        noExports: "main entrypoints must not export values.",
      },
    },
    create(context) {
      const filename = context.getFilename();

      if (!mainFilePattern.test(path.basename(filename))) {
        return {};
      }

      return {
        ExportAllDeclaration(node) {
          context.report({ node, messageId: "noExports" });
        },
        ExportDefaultDeclaration(node) {
          context.report({ node, messageId: "noExports" });
        },
        ExportNamedDeclaration(node) {
          context.report({ node, messageId: "noExports" });
        },
      };
    },
  },
  "primary-export-name": {
    meta: {
      type: "problem",
      docs: {
        description:
          "Require single-purpose function and class files to align with their primary exported entity.",
      },
      schema: [],
      messages: {
        filenameMismatch:
          "The primary exported entity '{{exportName}}' should align with file name '{{fileName}}'.",
      },
    },
    create(context) {
      return {
        Program(node) {
          const filename = context.getFilename();
          const stem = path.basename(filename).replace(/\.[^.]+$/u, "");

          if (primaryExportExceptions.has(stem)) {
            return;
          }

          const exportOptions = collectPrimaryExportOptions(node);
          const uniqueExportOptions = [
            ...new Map(
              exportOptions.map((option) => [option.name, option]),
            ).values(),
          ];

          if (uniqueExportOptions.length !== 1) {
            return;
          }

          const exportOption = uniqueExportOptions[0];

          if (normalizeName(exportOption.name) === normalizeName(stem)) {
            return;
          }

          context.report({
            node: exportOption.node,
            messageId: "filenameMismatch",
            data: {
              exportName: exportOption.name,
              fileName: stem,
            },
          });
        },
      };
    },
  },
  "predicate-boolean-names": {
    meta: {
      type: "problem",
      docs: {
        description:
          "Require mechanically identifiable boolean names to start with is or has.",
      },
      schema: [],
      messages: {
        predicateStyle:
          "Boolean names must start with is or has. Rename '{{name}}' to a predicate-style name.",
      },
    },
    create(context) {
      const sourceCode = context.sourceCode;

      return {
        FunctionDeclaration(node) {
          if (
            node.id !== null &&
            hasBooleanJsdoc(sourceCode, node) &&
            !isBooleanName(node.id.name)
          ) {
            context.report({
              node: node.id,
              messageId: "predicateStyle",
              data: {
                name: node.id.name,
              },
            });
          }
        },
        VariableDeclarator(node) {
          if (node.id.type !== "Identifier") {
            return;
          }

          if (
            node.init?.type === "Literal" &&
            typeof node.init.value === "boolean" &&
            !isBooleanName(node.id.name)
          ) {
            context.report({
              node: node.id,
              messageId: "predicateStyle",
              data: {
                name: node.id.name,
              },
            });
          }
        },
      };
    },
  },
  "require-function-jsdoc": {
    meta: {
      type: "problem",
      docs: {
        description:
          "Require module-scope named JavaScript functions to carry a JSDoc block.",
      },
      schema: [],
      messages: {
        missingJsdoc:
          "Add a JSDoc block above '{{name}}' to document the function.",
      },
    },
    create(context) {
      const sourceCode = context.sourceCode;

      return {
        FunctionDeclaration(node) {
          if (
            node.id === null ||
            (node.parent.type !== "Program" &&
              node.parent.type !== "ExportNamedDeclaration")
          ) {
            return;
          }

          if (getLeadingJsdoc(sourceCode, node) !== null) {
            return;
          }

          context.report({
            node: node.id,
            messageId: "missingJsdoc",
            data: {
              name: node.id.name,
            },
          });
        },
      };
    },
  },
  "no-classes-for-data": {
    meta: {
      type: "problem",
      docs: {
        description:
          "Require classes to be reserved for stateful resources or imperative adapters.",
      },
      schema: [],
      messages: {
        noClasses:
          "Classes are reserved for stateful resources or imperative adapters. Add @statefulResource or @imperativeAdapter if the class is warranted.",
      },
    },
    create(context) {
      const sourceCode = context.sourceCode;

      return {
        ClassDeclaration(node) {
          if (!hasClassExceptionTag(sourceCode, node)) {
            context.report({ node, messageId: "noClasses" });
          }
        },
        ClassExpression(node) {
          if (!hasClassExceptionTag(sourceCode, node.parent)) {
            context.report({ node, messageId: "noClasses" });
          }
        },
      };
    },
  },
};
