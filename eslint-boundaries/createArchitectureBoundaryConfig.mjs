import path from "node:path";

import { createConfig, strict } from "eslint-plugin-boundaries/config";

import { validateBoundaryConfig } from "./validateBoundaryConfig.mjs";

const publicIndexPattern = "index.{js,cjs,mjs,jsx,ts,cts,mts,tsx}";

/** Translate the canonical boundary registry into a flat ESLint config. */
export function createArchitectureBoundaryConfig({ boundaryConfig, repoRoot }) {
  validateBoundaryConfig(boundaryConfig);

  return createConfig({
    files: boundaryConfig.productionFiles,
    settings: {
      ...strict.settings,
      "boundaries/root-path": path.resolve(repoRoot),
      "boundaries/dependency-nodes": [
        "import",
        "export",
        "require",
        "dynamic-import",
      ],
      "boundaries/elements": createElementDescriptors(boundaryConfig),
      "boundaries/files": createFileDescriptors(boundaryConfig),
      "boundaries/flag-as-external": {
        outsideRootPath: true,
        customSourcePatterns: Object.values(boundaryConfig.workspaces).flatMap(
          ({ packageName }) => [packageName, `${packageName}/**`],
        ),
      },
    },
    rules: {
      ...strict.rules,
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          checkAllOrigins: true,
          checkUnknownLocals: true,
          checkInternals: true,
          policies: createDependencyPolicies(boundaryConfig),
        },
      ],
    },
  });
}

/** Return all declared source roots as repository-relative paths. */
export function getSourceRoots(config) {
  validateBoundaryConfig(config);

  return Object.values(config.workspaces).map((workspace) =>
    joinRepoPath(workspace.path, workspace.sourceRoot),
  );
}

/** Return test globs scoped to every declared source root. */
export function getTestFiles(config) {
  validateBoundaryConfig(config);

  return Object.values(config.workspaces).flatMap((workspace) =>
    config.testFilePatterns.map((pattern) =>
      joinRepoPath(workspace.path, workspace.sourceRoot, pattern),
    ),
  );
}

/** Create one globally unique element descriptor per first-level module. */
function createElementDescriptors(config) {
  return Object.entries(config.workspaces).flatMap(
    ([workspaceId, workspace]) =>
      Object.keys(workspace.modules).map((moduleName) => ({
        type: moduleType(workspaceId, moduleName),
        pattern: joinRepoPath(workspace.path, workspace.sourceRoot, moduleName),
        partialMatch: false,
      })),
  );
}

/** Describe explicit composition files and source-root tests. */
function createFileDescriptors(config) {
  return Object.entries(config.workspaces).flatMap(
    ([workspaceId, workspace]) => [
      ...Object.keys(workspace.compositionFiles).map((filePath) => ({
        pattern: joinRepoPath(workspace.path, workspace.sourceRoot, filePath),
        category: compositionCategory(workspaceId, filePath),
      })),
      ...config.testFilePatterns.map((pattern) => ({
        pattern: joinRepoPath(workspace.path, workspace.sourceRoot, pattern),
        category: testCategory(workspaceId),
      })),
    ],
  );
}

/** Create allow policies directly from declared owners and edges. */
function createDependencyPolicies(config) {
  const policies = [];

  for (const [workspaceId, workspace] of Object.entries(config.workspaces)) {
    for (const [moduleName, permissions] of Object.entries(workspace.modules)) {
      policies.push(
        ...createModulePolicies(
          config,
          workspaceId,
          workspace,
          moduleName,
          permissions,
        ),
      );
    }

    for (const [filePath, permissions] of Object.entries(
      workspace.compositionFiles,
    )) {
      const from = compositionSelector(workspaceId, filePath);

      policies.push(
        ...createPublicModulePolicies(
          from,
          workspaceId,
          permissions.allowedModuleDependencies,
          `Composition file ${workspaceId}/${filePath}`,
        ),
        ...createPermissionPolicies(config, workspace, from, permissions),
      );
    }

    const testFrom = testSelector(workspaceId);
    policies.push(
      ...createPublicModulePolicies(
        testFrom,
        workspaceId,
        Object.keys(workspace.modules),
        "Tests",
      ),
      ...createPermissionPolicies(config, workspace, testFrom, {
        allowedExternalDependencies: config.testAllowedExternalDependencies,
        allowedCoreDependencies: config.testAllowedCoreDependencies,
      }),
    );
  }

  return [...policies, ...createProductionToTestPolicies()];
}

/** Create same-module, declared-edge, provider, and parent-index policies. */
function createModulePolicies(
  config,
  workspaceId,
  workspace,
  moduleName,
  permissions,
) {
  const from = moduleSelector(workspaceId, moduleName);

  return [
    { from, allow: { to: from } },
    ...createPublicModulePolicies(
      from,
      workspaceId,
      permissions.allowedModuleDependencies,
      `Module ${workspaceId}/${moduleName}`,
    ),
    ...createPermissionPolicies(config, workspace, from, permissions),
    {
      from,
      disallow: {
        to: {
          element: {
            type: moduleType(workspaceId, moduleName),
            fileInternalPath: publicIndexPattern,
          },
        },
      },
      message: "Module implementations may not import their parent index.",
    },
  ];
}

/** Allow selected same-workspace modules only through their public indexes. */
function createPublicModulePolicies(from, workspaceId, moduleNames, ownerLabel) {
  return moduleNames.map((moduleName) => ({
    from,
    allow: { to: publicModuleSelector(workspaceId, moduleName) },
    message: `${ownerLabel} may import ${moduleName} only through its public index.`,
  }));
}

/** Create exact workspace-package, external, and core permissions. */
function createPermissionPolicies(config, workspace, from, permissions) {
  const workspacePolicies = workspace.allowedWorkspaceDependencies.map(
    (targetWorkspaceId) => {
      const packageName = config.workspaces[targetWorkspaceId].packageName;

      return {
        from,
        allow: {
          to: {
            module: { origin: "external", source: packageName, internalPath: null },
          },
        },
        message: `Import ${packageName} only through its package root.`,
      };
    },
  );

  return [
    ...workspacePolicies,
    ...createOriginPolicies(
      from,
      permissions.allowedExternalDependencies,
      "external",
    ),
    ...createOriginPolicies(from, permissions.allowedCoreDependencies, "core"),
  ];
}

/** Create exact provider permissions for one dependency origin. */
function createOriginPolicies(from, dependencies, origin) {
  return dependencies.map((specifier) => {
    const { source, internalPath } = splitModuleSpecifier(specifier);

    return {
      from,
      allow: { to: { module: { origin, source, internalPath } } },
    };
  });
}

/** Split an exact import specifier into the plugin's package and subpath axes. */
function splitModuleSpecifier(specifier) {
  const segments = specifier.split("/");
  const packageSegmentCount = specifier.startsWith("@") ? 2 : 1;

  return {
    source: segments.slice(0, packageSegmentCount).join("/"),
    internalPath:
      segments.length === packageSegmentCount
        ? null
        : segments.slice(packageSegmentCount).join("/"),
  };
}

/** Prevent module and composition production files from importing tests. */
function createProductionToTestPolicies() {
  const disallow = {
    disallow: { to: { file: { categories: "test:*" } } },
    message: "Production code may not import test files.",
  };

  return [
    { from: { file: { isUnknown: true } }, ...disallow },
    { from: { file: { categories: "composition:*" } }, ...disallow },
  ];
}

/** Select a declared module. */
function moduleSelector(workspaceId, moduleName) {
  return { element: { type: moduleType(workspaceId, moduleName) } };
}

/** Select a declared module's public index. */
function publicModuleSelector(workspaceId, moduleName) {
  return {
    element: {
      type: moduleType(workspaceId, moduleName),
      fileInternalPath: publicIndexPattern,
    },
  };
}

/** Select one declared composition file. */
function compositionSelector(workspaceId, filePath) {
  return { file: { categories: compositionCategory(workspaceId, filePath) } };
}

/** Select tests owned by one workspace. */
function testSelector(workspaceId) {
  return { file: { categories: testCategory(workspaceId) } };
}

/** Return the unique module element type. */
function moduleType(workspaceId, moduleName) {
  return `module:${workspaceId}/${moduleName}`;
}

/** Return the unique composition-file category. */
function compositionCategory(workspaceId, filePath) {
  return `composition:${workspaceId}/${filePath}`;
}

/** Return the unique workspace test category. */
function testCategory(workspaceId) {
  return `test:${workspaceId}`;
}

/** Join repository-relative fragments using glob-compatible separators. */
function joinRepoPath(...parts) {
  return parts.filter((part) => part !== ".").join("/");
}
