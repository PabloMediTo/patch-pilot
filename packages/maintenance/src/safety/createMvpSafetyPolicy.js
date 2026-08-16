/**
 * Creates the fixed execution and change limits for the MVP.
 *
 * @returns {object} Immutable MVP safety policy.
 */
export function createMvpSafetyPolicy() {
  return Object.freeze({
    execution: Object.freeze({
      allowedCommands: Object.freeze([
        Object.freeze({ executable: "npm", args: Object.freeze(["test"]) }),
        Object.freeze({ executable: "python", args: Object.freeze(["-m", "pytest"]) }),
      ]),
      cpuCount: 2,
      memoryBytes: 2_147_483_648,
      diskBytes: 5_368_709_120,
      timeoutMs: 600_000,
      maxOutputBytes: 1_048_576,
      networkAccess: "none",
    }),
    changes: Object.freeze({
      maxFiles: 10,
      maxChangedLines: 500,
      forbiddenBasenames: Object.freeze([
        ".env",
        "package-lock.json",
        "package.json",
        "pnpm-lock.yaml",
        "poetry.lock",
        "pyproject.toml",
        "requirements.txt",
        "uv.lock",
        "yarn.lock",
      ]),
      forbiddenExtensions: Object.freeze([".key", ".pem"]),
      forbiddenSegments: Object.freeze(["dist", "generated", "migrations"]),
    }),
    repositoryContext: Object.freeze({
      maxEntries: 1000,
      maxCandidates: 200,
      maxFiles: 12,
      maxFileBytes: 32_768,
      maxTotalBytes: 131_072,
      allowedExtensions: Object.freeze([
        ".cjs", ".ini", ".js", ".json", ".jsx", ".md", ".mjs", ".py", ".toml",
        ".ts", ".tsx", ".txt", ".yaml", ".yml",
      ]),
      forbiddenBasenames: Object.freeze([
        ".env", "package-lock.json", "pnpm-lock.yaml", "poetry.lock", "uv.lock", "yarn.lock",
      ]),
      forbiddenExtensions: Object.freeze([".key", ".pem"]),
      forbiddenSegments: Object.freeze([
        ".git", ".venv", "__pycache__", "build", "coverage", "dist", "generated",
        "node_modules", "venv",
      ]),
    }),
  });
}
