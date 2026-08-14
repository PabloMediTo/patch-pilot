import { executeWithMvpSafety, runInDockerSandbox } from "@patch-pilot/maintenance";
import { randomUUID } from "node:crypto";

import { createDockerCliExecutor } from "../docker-cli/index.js";

/**
 * Composes fixed MVP policy, Docker sandboxing, and bounded process execution.
 *
 * @param {{ execFileProcess?: Function, now?: Function, createId?: Function }} dependencies Runtime dependencies.
 * @returns {Function} Safe target-repository command executor.
 */
export function createSandboxCommandExecutor(dependencies = {}) {
  const executeDocker = createDockerCliExecutor(dependencies);
  const createId = dependencies.createId ?? randomUUID;

  return (request) => executeWithMvpSafety({
    request,
    runInSandbox: (spec) => runInDockerSandbox({
      spec,
      executeDocker,
      createContainerName: () => `patch-pilot-${createId()}`,
    }),
  });
}
