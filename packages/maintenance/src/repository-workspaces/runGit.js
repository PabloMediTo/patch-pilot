import { execFile } from "node:child_process";
import { env } from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Executes one bounded, non-interactive Git command without a shell.
 *
 * @param {{ cwd: string, args: string[] }} input Working directory and exact argument vector.
 * @returns {Promise<string>} Standard output.
 * @throws {Error} When Git exits unsuccessfully, times out, or exceeds the output limit.
 */
export async function runGit({ cwd, args }) {
  const result = await execFileAsync("git", args, {
    cwd,
    encoding: "utf8",
    env: { ...env, GIT_TERMINAL_PROMPT: "0" },
    maxBuffer: 1_048_576,
    timeout: 120_000,
    windowsHide: true,
  });

  return result.stdout;
}
