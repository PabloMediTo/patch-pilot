import { Buffer } from "node:buffer";

import { createGitHubInstallationTokenProvider } from "@patch-pilot/maintenance";

const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;

/**
 * Creates read-only GitHub repository authorization for disposable worker checkouts.
 *
 * @param {{ appId?: string | number, privateKey?: string, getInstallationToken?: Function, fetchImpl?: Function, clock?: Function }} options GitHub App configuration or controlled token port.
 * @returns {Function} Repository-authorization provider.
 */
export function createGitHubRepositoryAuthorization(options) {
  const getInstallationToken = options?.getInstallationToken
    ?? createGitHubInstallationTokenProvider({ ...options, permissions: { contents: "read" } });
  return async function authorizeRepository(target) {
    assertTarget(target);
    const token = await getInstallationToken(target);
    if (typeof token !== "string" || token.trim() === "" || Buffer.byteLength(token) > 4096) {
      throw new Error("GitHub repository authorization received an invalid token.");
    }
    const credentials = Buffer.from(`x-access-token:${token}`, "utf8").toString("base64");
    return `Basic ${credentials}`;
  };
}

/** Requires one exact installation and repository pair. */
function assertTarget(target) {
  if (!Number.isInteger(target?.installationId) || target.installationId <= 0
    || !REPOSITORY.test(target?.repository)) {
    throw new Error("GitHub repository authorization requires an installation and repository.");
  }
}
