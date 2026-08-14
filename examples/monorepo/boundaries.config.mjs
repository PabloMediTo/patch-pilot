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
  testAllowedExternalDependencies: ["vitest"],
  testAllowedCoreDependencies: ["node:assert/strict"],
  workspaces: {
    portal: {
      architectureRole: "application-shell",
      isDeploymentUnit: true,
      path: "apps/customer-portal",
      packageName: "@example/customer-portal",
      sourceRoot: "src",
      allowedWorkspaceDependencies: ["commerce", "generated-api"],
      modules: {
        checkout: {
          architectureRole: "conceptual-module",
          allowedModuleDependencies: ["order-tracking"],
          allowedExternalDependencies: ["react"],
          allowedCoreDependencies: [],
        },
        "order-tracking": {
          architectureRole: "conceptual-module",
          allowedModuleDependencies: [],
          allowedExternalDependencies: ["react"],
          allowedCoreDependencies: [],
        },
      },
      compositionFiles: {
        "main.tsx": {
          allowedModuleDependencies: ["checkout", "order-tracking"],
          allowedExternalDependencies: ["react-dom/client"],
          allowedCoreDependencies: [],
        },
      },
    },
    commerce: {
      architectureRole: "conceptual-package",
      isDeploymentUnit: false,
      path: "packages/commerce",
      packageName: "@example/commerce",
      sourceRoot: "src",
      allowedWorkspaceDependencies: [],
      modules: {
        ordering: {
          architectureRole: "conceptual-module",
          allowedModuleDependencies: ["pricing"],
          allowedExternalDependencies: [],
          allowedCoreDependencies: [],
        },
        pricing: {
          architectureRole: "conceptual-module",
          allowedModuleDependencies: [],
          allowedExternalDependencies: ["decimal.js"],
          allowedCoreDependencies: [],
        },
      },
      compositionFiles: {},
    },
    "generated-api": {
      architectureRole: "documented-technical-exception",
      exceptionReason:
        "The externally versioned generator replaces this package atomically, so it needs an independent release and regeneration lifecycle.",
      isDeploymentUnit: false,
      path: "packages/generated-api",
      packageName: "@example/generated-api",
      sourceRoot: "src",
      allowedWorkspaceDependencies: [],
      modules: {
        client: {
          architectureRole: "documented-technical-exception",
          exceptionReason:
            "The generator owns this first-level output shape and replaces it as one unit.",
          allowedModuleDependencies: [],
          allowedExternalDependencies: [],
          allowedCoreDependencies: [],
        },
      },
      compositionFiles: {},
    },
  },
};
