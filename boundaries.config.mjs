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
  workspaces: {},
};
