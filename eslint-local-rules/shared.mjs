import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.dirname(
  fileURLToPath(new URL("../eslint.config.mjs", import.meta.url)),
);

export const indexFilePattern = /^index\.[cm]?[jt]sx?$/u;

const sourceFileExtensions = new Set([
  ".js",
  ".cjs",
  ".mjs",
  ".jsx",
  ".ts",
  ".cts",
  ".mts",
  ".tsx",
]);
const testFilePattern = /\.(test|spec)\.[cm]?[jt]sx?$/u;
const reportedDirectories = new Set();
const booleanNamePattern = /^(is|has)[A-Z0-9_]/u;
const booleanJsdocPattern =
  /@returns?\s*\{\s*(?:Promise<\s*)?boolean(?:\s*>)?\s*\}/iu;
const classExceptionPattern = /@(statefulResource|imperativeAdapter)\b/u;

/**
 * Return whether a file name looks like production source instead of a test.
 *
 * @param {string} name The file name to inspect.
 * @returns {boolean} Whether the file should count as production source.
 */
export function isProductionSourceFile(name) {
  return (
    sourceFileExtensions.has(path.extname(name)) && !testFilePattern.test(name)
  );
}

/**
 * Return whether a relative directory sits in a declared source root.
 *
 * @param {string} relativeDir The repository-relative directory path.
 * @param {string[]} sourceRoots Repository-relative source-root paths.
 * @returns {boolean} Whether the directory belongs to a source tree.
 */
export function isSourceCodeDirectory(relativeDir, sourceRoots) {
  if (relativeDir.startsWith("..") || path.isAbsolute(relativeDir)) {
    return false;
  }

  const normalizedDirectory = path.normalize(relativeDir);

  return sourceRoots.some(
    (sourceRoot) =>
      normalizedDirectory === path.normalize(sourceRoot) ||
      normalizedDirectory.startsWith(`${path.normalize(sourceRoot)}${path.sep}`),
  );
}

/**
 * Clear the directory-report cache used by tests.
 *
 * @returns {void}
 */
export function resetReportedDirectories() {
  reportedDirectories.clear();
}

/**
 * Return whether a directory has already been reported in this lint process.
 *
 * @param {string} directory The absolute directory path.
 * @returns {boolean} Whether the directory is already marked as reported.
 */
export function hasReportedDirectory(directory) {
  return reportedDirectories.has(directory);
}

/**
 * Mark a directory as already reported for the current lint process.
 *
 * @param {string} directory The absolute directory path.
 * @returns {void}
 */
export function markReportedDirectory(directory) {
  reportedDirectories.add(directory);
}

/**
 * Return the last leading JSDoc block comment for a node when it exists.
 *
 * @param {import("eslint").SourceCode} sourceCode The file source code.
 * @param {import("eslint").Rule.Node} node The node to inspect.
 * @returns {import("eslint").AST.Token | null} The JSDoc comment token.
 */
export function getLeadingJsdoc(sourceCode, node) {
  const targets = [node];

  if (
    node.parent?.type === "ExportNamedDeclaration" ||
    node.parent?.type === "VariableDeclaration"
  ) {
    targets.unshift(node.parent);
  }

  for (const target of targets) {
    const comments = sourceCode.getCommentsBefore(target);
    const comment = comments.at(-1);

    if (
      comment?.type === "Block" &&
      comment.value.startsWith("*") &&
      comment.loc.end.line === target.loc.start.line - 1
    ) {
      return comment;
    }
  }

  return null;
}

/**
 * Return whether a node has a JSDoc block that documents boolean output.
 *
 * @param {import("eslint").SourceCode} sourceCode The file source code.
 * @param {import("eslint").Rule.Node} node The node to inspect.
 * @returns {boolean} Whether the node is documented as returning boolean.
 */
export function hasBooleanJsdoc(sourceCode, node) {
  const jsdoc = getLeadingJsdoc(sourceCode, node);

  return jsdoc !== null && booleanJsdocPattern.test(jsdoc.value);
}

/**
 * Return whether a node carries a class-exception tag in its JSDoc block.
 *
 * @param {import("eslint").SourceCode} sourceCode The file source code.
 * @param {import("eslint").Rule.Node} node The node to inspect.
 * @returns {boolean} Whether the node is marked as a valid class exception.
 */
export function hasClassExceptionTag(sourceCode, node) {
  const jsdoc = getLeadingJsdoc(sourceCode, node);

  return jsdoc !== null && classExceptionPattern.test(jsdoc.value);
}

/**
 * Normalize a file or identifier name for kebab-case versus camelCase checks.
 *
 * @param {string} value The name to normalize.
 * @returns {string} The normalized comparison form.
 */
export function normalizeName(value) {
  return value.replace(/[^a-zA-Z0-9]+/gu, "").toLowerCase();
}

/**
 * Return whether a name follows the boolean predicate convention.
 *
 * @param {string} name The identifier name to inspect.
 * @returns {boolean} Whether the name starts with `is` or `has`.
 */
export function isBooleanName(name) {
  return booleanNamePattern.test(name);
}

/**
 * Return whether a node is a function-like variable declarator.
 *
 * @param {import("eslint").Rule.Node} node The node to inspect.
 * @returns {boolean} Whether the variable declarator wraps a function.
 */
export function isFunctionLikeVariableDeclarator(node) {
  return (
    node.type === "VariableDeclarator" &&
    node.id.type === "Identifier" &&
    node.init !== null &&
    (node.init.type === "ArrowFunctionExpression" ||
      node.init.type === "FunctionExpression" ||
      node.init.type === "ClassExpression")
  );
}

/**
 * Read a directory and return its entries.
 *
 * @param {string} directory The directory to inspect.
 * @returns {fs.Dirent[]} The directory entries.
 */
export function readDirectoryEntries(directory) {
  return fs.readdirSync(directory, { withFileTypes: true });
}
