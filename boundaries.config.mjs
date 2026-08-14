export const boundaryConfig = {
  topology: "monorepo",
  repositoryRole: "mixed",
  productionFiles: [
    "apps/*/src/**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}",
    "packages/*/src/**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}",
  ],
  testFilePatterns: [
    "**/*.{test,spec}.{js,cjs,mjs,jsx,ts,cts,mts,tsx}",
  ],
  testAllowedExternalDependencies: [],
  testAllowedCoreDependencies: ["node:assert/strict"],
  workspaces: {
    "maintainer-api": {
      architectureRole: "application-shell",
      isDeploymentUnit: true,
      path: "apps/maintainer-api",
      packageName: "@patch-pilot/maintainer-api",
      sourceRoot: "src",
      allowedWorkspaceDependencies: [],
      modules: {
        application: {
          architectureRole: "application-role",
          allowedModuleDependencies: [],
          allowedExternalDependencies: [],
          allowedCoreDependencies: [],
        },
      },
      compositionFiles: {
        "index.js": {
          allowedModuleDependencies: ["application"],
          allowedExternalDependencies: [],
          allowedCoreDependencies: [],
        },
        "main.js": {
          allowedModuleDependencies: ["application"],
          allowedExternalDependencies: [],
          allowedCoreDependencies: [],
        },
      },
    },
    "maintainer-worker": {
      architectureRole: "application-shell",
      isDeploymentUnit: true,
      path: "apps/maintainer-worker",
      packageName: "@patch-pilot/maintainer-worker",
      sourceRoot: "src",
      allowedWorkspaceDependencies: [],
      modules: {
        application: {
          architectureRole: "application-role",
          allowedModuleDependencies: [],
          allowedExternalDependencies: [],
          allowedCoreDependencies: [],
        },
      },
      compositionFiles: {
        "index.js": {
          allowedModuleDependencies: ["application"],
          allowedExternalDependencies: [],
          allowedCoreDependencies: [],
        },
        "main.js": {
          allowedModuleDependencies: ["application"],
          allowedExternalDependencies: [],
          allowedCoreDependencies: [],
        },
      },
    },
    "maintainer-web": {
      architectureRole: "application-shell",
      isDeploymentUnit: true,
      path: "apps/maintainer-web",
      packageName: "@patch-pilot/maintainer-web",
      sourceRoot: "src",
      allowedWorkspaceDependencies: [],
      modules: {
        application: {
          architectureRole: "application-role",
          allowedModuleDependencies: [],
          allowedExternalDependencies: [],
          allowedCoreDependencies: [],
        },
      },
      compositionFiles: {
        "index.js": {
          allowedModuleDependencies: ["application"],
          allowedExternalDependencies: [],
          allowedCoreDependencies: [],
        },
        "main.js": {
          allowedModuleDependencies: ["application"],
          allowedExternalDependencies: [],
          allowedCoreDependencies: [],
        },
      },
    },
    maintenance: {
      architectureRole: "conceptual-package",
      isDeploymentUnit: false,
      path: "packages/maintenance",
      packageName: "@patch-pilot/maintenance",
      sourceRoot: "src",
      allowedWorkspaceDependencies: [],
      modules: {
        runs: {
          architectureRole: "conceptual-module",
          allowedModuleDependencies: [],
          allowedExternalDependencies: [],
          allowedCoreDependencies: [],
        },
      },
      compositionFiles: {},
    },
  },
};
