export const boundaryConfig = {
  topology: "single-package",
  repositoryRole: "application",
  productionFiles: ["src/**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}"],
  testFilePatterns: [
    "**/*.{test,spec}.{js,cjs,mjs,jsx,ts,cts,mts,tsx}",
  ],
  testAllowedExternalDependencies: ["vitest"],
  testAllowedCoreDependencies: ["node:assert/strict"],
  workspaces: {
    application: {
      architectureRole: "repository-root",
      isDeploymentUnit: true,
      path: ".",
      packageName: "@example/order-service",
      sourceRoot: "src",
      allowedWorkspaceDependencies: [],
      modules: {
        "order-intake": {
          architectureRole: "conceptual-module",
          allowedModuleDependencies: ["order-history"],
          allowedExternalDependencies: ["zod"],
          allowedCoreDependencies: [],
        },
        "order-history": {
          architectureRole: "conceptual-module",
          allowedModuleDependencies: [],
          allowedExternalDependencies: [],
          allowedCoreDependencies: [],
        },
      },
      compositionFiles: {
        "main.ts": {
          allowedModuleDependencies: ["order-intake", "order-history"],
          allowedExternalDependencies: ["dotenv/config"],
          allowedCoreDependencies: [],
        },
      },
    },
  },
};
