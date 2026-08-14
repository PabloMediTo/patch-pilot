import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Detects one supported Python or TypeScript project and its standard test command.
 *
 * @param {{ workspaceDirectory: string }} input Verified repository workspace.
 * @returns {Promise<object>} Supported project descriptor or explicit unsupported result.
 */
export async function detectSupportedProject({ workspaceDirectory }) {
  const evidence = await readProjectEvidence(workspaceDirectory);
  const typeScriptProject = detectTypeScriptProject(workspaceDirectory, evidence);
  const pythonProject = detectPythonProject(workspaceDirectory, evidence);
  const supportedProjects = [typeScriptProject, pythonProject].filter(Boolean);

  if (supportedProjects.length === 1) {
    return supportedProjects[0];
  }

  const reason = supportedProjects.length === 0
    ? "no-supported-project"
    : "ambiguous-project";
  return Object.freeze({ status: "unsupported", reason });
}

/**
 * Reads only the root files needed for deterministic MVP detection.
 *
 * @param {string} workspaceDirectory Repository workspace.
 * @returns {Promise<Record<string, string | null>>} Detection evidence by filename.
 */
async function readProjectEvidence(workspaceDirectory) {
  const filenames = [
    "package.json",
    "tsconfig.json",
    "pyproject.toml",
    "requirements.txt",
    "pytest.ini",
    "conftest.py",
  ];
  const entries = await Promise.all(
    filenames.map(async (filename) => [
      filename,
      await readOptionalFile(join(workspaceDirectory, filename)),
    ]),
  );
  return Object.fromEntries(entries);
}

/**
 * Detects a TypeScript npm project with an explicit test script.
 *
 * @param {string} workspaceDirectory Repository workspace.
 * @param {Record<string, string | null>} evidence Root-file evidence.
 * @returns {object | null} Supported project descriptor when recognizable.
 */
function detectTypeScriptProject(workspaceDirectory, evidence) {
  const packageManifest = parseJson(evidence["package.json"]);
  const testScript = packageManifest?.scripts?.test;
  const hasTestScript = typeof testScript === "string" && testScript.trim() !== "";
  const dependencies = {
    ...packageManifest?.dependencies,
    ...packageManifest?.devDependencies,
  };
  const hasTypeScript = evidence["tsconfig.json"] !== null || typeof dependencies.typescript === "string";

  return hasTestScript && hasTypeScript
    ? createSupportedProject({
      workspaceDirectory,
      language: "typescript",
      executable: "npm",
      args: ["test"],
    })
    : null;
}

/**
 * Detects a Python project with recognizable pytest configuration.
 *
 * @param {string} workspaceDirectory Repository workspace.
 * @param {Record<string, string | null>} evidence Root-file evidence.
 * @returns {object | null} Supported project descriptor when recognizable.
 */
function detectPythonProject(workspaceDirectory, evidence) {
  const hasPythonManifest = evidence["pyproject.toml"] !== null || evidence["requirements.txt"] !== null;
  const hasPytestConfiguration = evidence["pytest.ini"] !== null
    || evidence["conftest.py"] !== null
    || evidence["pyproject.toml"]?.includes("[tool.pytest.ini_options]")
    || /(?:^|\s)pytest(?:\s|[<>=~!]|$)/mu.test(evidence["requirements.txt"] ?? "");

  return hasPythonManifest && hasPytestConfiguration
    ? createSupportedProject({
      workspaceDirectory,
      language: "python",
      executable: "python",
      args: ["-m", "pytest"],
    })
    : null;
}

/**
 * Creates an immutable supported-project descriptor.
 *
 * @param {{ workspaceDirectory: string, language: string, executable: string, args: string[] }} input Detection result.
 * @returns {object} Supported project descriptor.
 */
function createSupportedProject(input) {
  return Object.freeze({
    status: "supported",
    language: input.language,
    workspaceDirectory: input.workspaceDirectory,
    command: Object.freeze({
      executable: input.executable,
      args: Object.freeze(input.args),
    }),
  });
}

/**
 * Reads a UTF-8 file when present.
 *
 * @param {string} path Candidate path.
 * @returns {Promise<string | null>} File contents or null when absent.
 * @throws {Error} When reading fails for a reason other than absence.
 */
async function readOptionalFile(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Parses optional JSON without treating malformed input as a supported project.
 *
 * @param {string | null} source Optional JSON source.
 * @returns {object | null} Parsed record or null.
 */
function parseJson(source) {
  try {
    return source === null ? null : JSON.parse(source);
  } catch {
    return null;
  }
}
