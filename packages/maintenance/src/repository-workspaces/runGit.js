import { execFile } from "node:child_process";
import { env } from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Executes one bounded, non-interactive Git command without a shell.
 *
 * @param {{ cwd: string, args: string[], authorizationHeader?: string, authorizationUrl?: string }} input Working directory, exact argument vector, and optional ephemeral HTTP authorization target.
 * @returns {Promise<string>} Standard output.
 * @throws {Error} When Git exits unsuccessfully, times out, or exceeds the output limit.
 */
export async function runGit({ cwd, args, authorizationHeader, authorizationUrl }) {
  const result = await execFileAsync("git", args, {
    cwd,
    encoding: "utf8",
    env: createGitExecutionEnvironment(authorizationHeader, authorizationUrl),
    maxBuffer: 1_048_576,
    timeout: 120_000,
    windowsHide: true,
  });

  return result.stdout;
}

/**
 * Builds one non-interactive process environment with optional in-memory Git HTTP authorization.
 *
 * @param {string | undefined} authorizationHeader Complete HTTP Authorization header value.
 * @param {string | undefined} authorizationUrl Exact HTTPS URL receiving authorization.
 * @param {object} [processEnvironment] Base process environment.
 * @returns {object} Child-process environment.
 */
export function createGitExecutionEnvironment(authorizationHeader, authorizationUrl,
  processEnvironment = env) {
  const baseEnvironment = { ...processEnvironment, GIT_TERMINAL_PROMPT: "0" };
  if (authorizationHeader === undefined) return baseEnvironment;
  return { ...baseEnvironment, GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: `http.${authorizationUrl}.extraHeader`,
    GIT_CONFIG_VALUE_0: `Authorization: ${authorizationHeader}` };
}
