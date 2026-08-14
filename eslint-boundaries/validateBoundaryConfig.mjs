const keys = {
  root: new Set([
    "productionFiles",
    "repositoryRole",
    "testAllowedCoreDependencies",
    "testAllowedExternalDependencies",
    "testFilePatterns",
    "topology",
    "workspaces",
  ]),
  workspace: new Set([
    "allowedWorkspaceDependencies",
    "architectureRole",
    "compositionFiles",
    "exceptionReason",
    "isDeploymentUnit",
    "modules",
    "packageName",
    "path",
    "sourceRoot",
  ]),
  module: new Set([
    "allowedCoreDependencies",
    "allowedExternalDependencies",
    "allowedModuleDependencies",
    "architectureRole",
    "exceptionReason",
  ]),
  composition: new Set([
    "allowedCoreDependencies",
    "allowedExternalDependencies",
    "allowedModuleDependencies",
  ]),
};
const allowedValues = {
  topology: new Set(["monorepo", "single-package"]),
  repositoryRole: new Set(["application", "library", "mixed", "tooling"]),
  workspaceRole: new Set([
    "application-shell",
    "conceptual-package",
    "documented-technical-exception",
    "repository-root",
  ]),
  moduleRole: new Set([
    "application-role",
    "conceptual-module",
    "documented-technical-exception",
  ]),
};
const globCharacterPattern = /[*?[\]{}!]/u;

/** Validate and return the canonical boundary registry. */
export function validateBoundaryConfig(config) {
  assertRecord(config, "boundaryConfig");
  assertKnownKeys(config, keys.root, "boundaryConfig");
  assertAllowed(config.topology, allowedValues.topology, "boundaryConfig.topology");
  assertAllowed(
    config.repositoryRole,
    allowedValues.repositoryRole,
    "boundaryConfig.repositoryRole",
  );
  assertStringArray(config.productionFiles, "boundaryConfig.productionFiles", false);
  assertStringArray(config.testFilePatterns, "boundaryConfig.testFilePatterns");
  assertDependencies(
    config.testAllowedExternalDependencies,
    "boundaryConfig.testAllowedExternalDependencies",
    "external",
  );
  assertDependencies(
    config.testAllowedCoreDependencies,
    "boundaryConfig.testAllowedCoreDependencies",
    "core",
  );
  assertRecord(config.workspaces, "boundaryConfig.workspaces");

  const workspaces = Object.entries(config.workspaces);

  if (config.topology === "single-package" && workspaces.length !== 1) {
    throw new Error("A single-package boundary config must declare one workspace.");
  }

  if (config.topology === "single-package" && config.repositoryRole === "mixed") {
    throw new Error("A single-package repository cannot have repositoryRole 'mixed'.");
  }

  const identities = createWorkspaceIdentities(workspaces);

  for (const [workspaceId, workspace] of workspaces) {
    validateWorkspace(workspaceId, workspace, config, identities);
  }

  assertAcyclic(
    new Map(
      workspaces.map(([workspaceId, workspace]) => [
        workspaceId,
        workspace.allowedWorkspaceDependencies,
      ]),
    ),
    "workspace dependency graph",
  );
  rejectInternalPackagesFromExternalLists(config, identities.packageNames);

  return config;
}

/** Collect and validate identities that must be unique repository-wide. */
function createWorkspaceIdentities(workspaces) {
  const workspaceIds = new Set();
  const paths = new Set();
  const packageNames = new Set();

  for (const [workspaceId, workspace] of workspaces) {
    assertBoundaryName(workspaceId, `workspace id '${workspaceId}'`);
    assertRecord(workspace, `workspace '${workspaceId}'`);
    assertUnique(workspaceIds, workspaceId, "workspace id");
    assertUnique(paths, workspace.path, "workspace path");
    assertUnique(packageNames, workspace.packageName, "workspace package name");
  }

  return { workspaceIds, packageNames };
}

/** Validate one workspace, its modules, and its composition files. */
function validateWorkspace(workspaceId, workspace, config, identities) {
  const label = `workspace '${workspaceId}'`;

  assertKnownKeys(workspace, keys.workspace, label);
  assertAllowed(
    workspace.architectureRole,
    allowedValues.workspaceRole,
    `${label}.architectureRole`,
  );
  assertBoolean(workspace.isDeploymentUnit, `${label}.isDeploymentUnit`);
  validateWorkspaceRole(workspace, label, config.topology);
  assertLiteralPath(workspace.path, `${label}.path`, config.topology === "single-package");
  assertPackageName(workspace.packageName, `${label}.packageName`);
  assertLiteralPath(workspace.sourceRoot, `${label}.sourceRoot`);
  assertStringArray(
    workspace.allowedWorkspaceDependencies,
    `${label}.allowedWorkspaceDependencies`,
  );
  assertRecord(workspace.modules, `${label}.modules`);
  assertRecord(workspace.compositionFiles, `${label}.compositionFiles`);

  if (config.topology === "single-package" && workspace.path !== ".") {
    throw new Error("The single-package workspace path must be '.'.");
  }

  for (const target of workspace.allowedWorkspaceDependencies) {
    assertReference(target, workspaceId, identities.workspaceIds, "workspace");
  }

  validateModules(workspaceId, workspace, config.repositoryRole);
  validateCompositionFiles(workspaceId, workspace);
}

/** Keep topology, role, deployment, and exception state consistent. */
function validateWorkspaceRole(workspace, label, topology) {
  const role = workspace.architectureRole;

  if (topology === "single-package" && role !== "repository-root") {
    throw new Error(`${label}.architectureRole must be 'repository-root'.`);
  }

  if (topology === "monorepo" && role === "repository-root") {
    throw new Error(`${label}.architectureRole cannot be 'repository-root'.`);
  }

  if (role === "application-shell" && !workspace.isDeploymentUnit) {
    throw new Error(`${label} application shells must be deployment units.`);
  }

  if (role === "conceptual-package" && workspace.isDeploymentUnit) {
    throw new Error(`${label} conceptual packages cannot be deployment units.`);
  }

  validateException(workspace, label);
}

/** Validate first-level modules and their acyclic local graph. */
function validateModules(workspaceId, workspace, repositoryRole) {
  const modules = Object.entries(workspace.modules);
  const moduleNames = new Set(modules.map(([moduleName]) => moduleName));

  for (const [moduleName, moduleConfig] of modules) {
    const label = `module '${workspaceId}/${moduleName}'`;

    assertBoundaryName(moduleName, label);
    assertRecord(moduleConfig, label);
    assertKnownKeys(moduleConfig, keys.module, label);
    assertAllowed(
      moduleConfig.architectureRole,
      allowedValues.moduleRole,
      `${label}.architectureRole`,
    );
    validateModuleRole(moduleConfig, label, workspace, repositoryRole);
    validatePermissions(moduleConfig, label);

    for (const target of moduleConfig.allowedModuleDependencies) {
      assertReference(target, moduleName, moduleNames, "module", workspaceId);
    }
  }

  assertAcyclic(
    new Map(
      modules.map(([moduleName, moduleConfig]) => [
        moduleName,
        moduleConfig.allowedModuleDependencies,
      ]),
    ),
    `module dependency graph for workspace '${workspaceId}'`,
  );
}

/** Validate whether a module role is valid for its owning workspace. */
function validateModuleRole(moduleConfig, label, workspace, repositoryRole) {
  const isApplicationRoot =
    workspace.architectureRole === "repository-root" &&
    repositoryRole === "application";
  const isApplicationShell = workspace.architectureRole === "application-shell";

  if (
    moduleConfig.architectureRole === "application-role" &&
    !isApplicationRoot &&
    !isApplicationShell
  ) {
    throw new Error(`${label} application roles require an application owner.`);
  }

  validateException(moduleConfig, label);
}

/** Validate explicit source-root composition permissions. */
function validateCompositionFiles(workspaceId, workspace) {
  const moduleNames = new Set(Object.keys(workspace.modules));

  for (const [filePath, fileConfig] of Object.entries(workspace.compositionFiles)) {
    const label = `composition file '${workspaceId}/${filePath}'`;

    assertLiteralPath(filePath, label);
    assertRecord(fileConfig, label);
    assertKnownKeys(fileConfig, keys.composition, label);
    validatePermissions(fileConfig, label);

    for (const target of fileConfig.allowedModuleDependencies) {
      if (!moduleNames.has(target)) {
        throw new Error(`${label} references unknown module '${target}'.`);
      }
    }
  }
}

/** Validate the three dependency arrays shared by modules and composition. */
function validatePermissions(owner, label) {
  assertStringArray(owner.allowedModuleDependencies, `${label}.allowedModuleDependencies`);
  assertDependencies(
    owner.allowedExternalDependencies,
    `${label}.allowedExternalDependencies`,
    "external",
  );
  assertDependencies(
    owner.allowedCoreDependencies,
    `${label}.allowedCoreDependencies`,
    "core",
  );
}

/** Require a reason only for an explicitly technical role. */
function validateException(owner, label) {
  if (owner.architectureRole === "documented-technical-exception") {
    if (!isNonEmptyString(owner.exceptionReason)) {
      throw new Error(
        `${label}.exceptionReason must explain the concrete technical exception.`,
      );
    }

    return;
  }

  if (Object.hasOwn(owner, "exceptionReason")) {
    throw new Error(`${label}.exceptionReason is only valid for an exception.`);
  }
}

/** Prevent internal package roots from masquerading as external providers. */
function rejectInternalPackagesFromExternalLists(config, packageNames) {
  const lists = [config.testAllowedExternalDependencies];

  for (const workspace of Object.values(config.workspaces)) {
    lists.push(
      ...Object.values(workspace.modules).map(
        (moduleConfig) => moduleConfig.allowedExternalDependencies,
      ),
      ...Object.values(workspace.compositionFiles).map(
        (fileConfig) => fileConfig.allowedExternalDependencies,
      ),
    );
  }

  for (const dependency of lists.flat()) {
    const internalPackage = [...packageNames].find(
      (packageName) =>
        dependency === packageName || dependency.startsWith(`${packageName}/`),
    );

    if (internalPackage !== undefined) {
      throw new Error(
        `Internal package '${internalPackage}' cannot be an external dependency.`,
      );
    }
  }
}

/** Reject cycles in an explicitly permitted graph. */
function assertAcyclic(graph, label) {
  const visited = new Set();
  const active = new Set();

  function visit(node, path) {
    if (active.has(node)) {
      const cycleStart = path.indexOf(node);
      const cycle = [...path.slice(cycleStart), node].join(" -> ");

      throw new Error(`${label} contains a permitted cycle: ${cycle}.`);
    }

    if (visited.has(node)) {
      return;
    }

    active.add(node);
    for (const dependency of graph.get(node) ?? []) {
      visit(dependency, [...path, node]);
    }
    active.delete(node);
    visited.add(node);
  }

  for (const node of graph.keys()) {
    visit(node, []);
  }
}

/** Validate one exact external or Node.js-core dependency list. */
function assertDependencies(dependencies, label, origin) {
  assertStringArray(dependencies, label);

  for (const dependency of dependencies) {
    const isCore = dependency.startsWith("node:") && dependency.length > 5;
    const isInvalidExternal =
      dependency.startsWith(".") || dependency.startsWith("/") || isCore;

    if (
      globCharacterPattern.test(dependency) ||
      (origin === "core" ? !isCore : isInvalidExternal)
    ) {
      throw new Error(`${label} must contain exact ${origin} import specifiers.`);
    }
  }
}

/** Validate a reference and reject self-edges. */
function assertReference(target, source, known, kind, workspaceId) {
  if (!known.has(target)) {
    const owner = kind === "module" ? `Module '${workspaceId}/${source}'` : `Workspace '${source}'`;
    throw new Error(`${owner} references unknown ${kind} '${target}'.`);
  }

  if (target === source) {
    throw new Error(`${kind} '${source}' must not list itself as a dependency.`);
  }
}

/** Validate an object and reject unknown schema keys. */
function assertKnownKeys(value, allowedKeys, label) {
  const unknownKey = Object.keys(value).find((key) => !allowedKeys.has(key));

  if (unknownKey !== undefined) {
    throw new Error(`${label} contains unknown key '${unknownKey}'.`);
  }
}

/** Validate a unique array of non-empty strings. */
function assertStringArray(value, label, isEmptyAllowed = true) {
  if (!Array.isArray(value) || value.some((item) => !isNonEmptyString(item))) {
    throw new Error(`${label} must be an array of non-empty strings.`);
  }

  if (!isEmptyAllowed && value.length === 0) {
    throw new Error(`${label} must not be empty.`);
  }

  if (new Set(value).size !== value.length) {
    throw new Error(`${label} must not contain duplicates.`);
  }
}

/** Validate a literal repository-relative path without traversal. */
function assertLiteralPath(value, label, isDotAllowed = false) {
  if (isDotAllowed && value === ".") {
    return;
  }

  if (
    !isNonEmptyString(value) ||
    value === "." ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.split("/").some((segment) => segment === "" || segment === "..") ||
    globCharacterPattern.test(value)
  ) {
    throw new Error(`${label} must be a literal repository-relative path.`);
  }
}

/** Validate a one-segment workspace or module identifier. */
function assertBoundaryName(value, label) {
  if (
    !isNonEmptyString(value) ||
    value === "." ||
    value === ".." ||
    value.includes("/") ||
    value.includes("\\") ||
    globCharacterPattern.test(value)
  ) {
    throw new Error(`${label} must be one literal path segment.`);
  }
}

/** Validate an exact package import root. */
function assertPackageName(value, label) {
  const segments = isNonEmptyString(value) ? value.split("/") : [];
  const hasValidSegmentCount = isNonEmptyString(value) && value.startsWith("@")
    ? segments.length === 2 && segments[0].length > 1 && segments[1].length > 0
    : segments.length === 1;

  if (
    !isNonEmptyString(value) ||
    !hasValidSegmentCount ||
    value.startsWith(".") ||
    value.startsWith("/") ||
    value.startsWith("node:") ||
    globCharacterPattern.test(value)
  ) {
    throw new Error(`${label} must be an exact package name.`);
  }
}

/** Validate a plain record. */
function assertRecord(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

/** Validate a value against an allowed set. */
function assertAllowed(value, allowed, label) {
  if (!allowed.has(value)) {
    throw new Error(`${label} must be one of: ${[...allowed].join(", ")}.`);
  }
}

/** Validate a boolean. */
function assertBoolean(value, label) {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be boolean.`);
  }
}

/** Add a unique identity to a set. */
function assertUnique(values, value, label) {
  if (values.has(value)) {
    throw new Error(`Duplicate ${label} '${value}'.`);
  }

  values.add(value);
}

/** Return whether a value is a non-empty string. */
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
