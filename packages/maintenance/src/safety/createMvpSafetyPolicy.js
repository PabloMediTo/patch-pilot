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
  });
}
