import assert from "node:assert/strict";

import { assessPilotReadiness } from "./pilot-readiness.mjs";

const environment = Object.freeze({
  PATCH_PILOT_OPENAI_API_KEY: "controlled-openai-key",
  PATCH_PILOT_GITHUB_APP_ID: "123",
  PATCH_PILOT_GITHUB_APP_PRIVATE_KEY: "controlled-private-key",
  PATCH_PILOT_GITHUB_WEBHOOK_SECRET: "controlled-webhook-secret",
  PATCH_PILOT_API_BEARER_TOKEN: "controlled-bearer-token-with-32-characters",
  PATCH_PILOT_API_ACTOR_ID: "operator:pilot",
  PATCH_PILOT_PYTHON_PILOT_REPOSITORY: "pilot/python-bug",
  PATCH_PILOT_PYTHON_PILOT_ISSUE: "1",
  PATCH_PILOT_TYPESCRIPT_PILOT_REPOSITORY: "pilot/typescript-bug",
  PATCH_PILOT_TYPESCRIPT_PILOT_ISSUE: "2",
});
const commands = [];
const ready = await assessPilotReadiness({ environment, projectDirectory: "C:/pilot",
  runCommand: async (executable, args, options) => {
    commands.push({ executable, args, options });
  } });

assert.equal(ready.status, "ready");
assert.equal(ready.configuration.status, "ready");
assert.deepEqual(commands, [
  { executable: "docker", args: ["version", "--format", "{{.Server.Version}}"],
    options: { cwd: "C:/pilot" } },
  { executable: "docker", args: ["compose", "version", "--short"],
    options: { cwd: "C:/pilot" } },
  { executable: "docker", args: ["compose", "config", "--quiet"],
    options: { cwd: "C:/pilot" } },
]);

const blocked = await assessPilotReadiness({ environment: {
  ...environment, PATCH_PILOT_OPENAI_API_KEY: "",
  PATCH_PILOT_PYTHON_PILOT_REPOSITORY: "not-a-repository",
}, projectDirectory: "C:/pilot", runCommand: async () => {
  throw new Error("docker is unavailable");
} });
assert.equal(blocked.status, "blocked");
assert.deepEqual(blocked.configuration.missingVariables, ["PATCH_PILOT_OPENAI_API_KEY"]);
assert.deepEqual(blocked.configuration.invalidVariables,
  ["PATCH_PILOT_PYTHON_PILOT_REPOSITORY"]);
assert.deepEqual(blocked.tooling.checks.map(({ status, reason }) => ({ status, reason })), [
  { status: "blocked", reason: "docker-engine-unavailable" },
  { status: "blocked", reason: "docker-compose-unavailable" },
  { status: "blocked", reason: "compose-config-unavailable" },
]);
assert.equal(JSON.stringify(blocked).includes("controlled-private-key"), false);

const invalidAuthentication = await assessPilotReadiness({ environment: {
  ...environment,
  PATCH_PILOT_API_BEARER_TOKEN: " controlled-bearer-token-with-32-characters ",
  PATCH_PILOT_API_ACTOR_ID: "unsafe actor",
}, projectDirectory: "C:/pilot", runCommand: async () => {} });
assert.equal(invalidAuthentication.status, "blocked");
assert.deepEqual(invalidAuthentication.configuration.invalidVariables, [
  "PATCH_PILOT_API_BEARER_TOKEN",
  "PATCH_PILOT_API_ACTOR_ID",
]);
assert.equal(JSON.stringify(invalidAuthentication).includes("unsafe actor"), false);
assert.equal(JSON.stringify(invalidAuthentication).includes("controlled-bearer"), false);

const duplicateTargets = await assessPilotReadiness({ environment: {
  ...environment,
  PATCH_PILOT_PYTHON_PILOT_REPOSITORY: "Pilot/Shared-Repository",
  PATCH_PILOT_TYPESCRIPT_PILOT_REPOSITORY: " pilot/shared-repository ",
}, projectDirectory: "C:/pilot", runCommand: async () => {} });
assert.equal(duplicateTargets.status, "blocked");
assert.deepEqual(duplicateTargets.configuration.invalidVariables, [
  "PATCH_PILOT_PYTHON_PILOT_REPOSITORY",
  "PATCH_PILOT_TYPESCRIPT_PILOT_REPOSITORY",
]);
assert.equal(JSON.stringify(duplicateTargets).includes("Shared-Repository"), false);

const maximumIssueNumber = await assessPilotReadiness({ environment: {
  ...environment, PATCH_PILOT_PYTHON_PILOT_ISSUE: "2147483647",
}, projectDirectory: "C:/pilot", runCommand: async () => {} });
assert.equal(maximumIssueNumber.status, "ready");

const oversizedIssueNumber = await assessPilotReadiness({ environment: {
  ...environment, PATCH_PILOT_TYPESCRIPT_PILOT_ISSUE: "2147483648",
}, projectDirectory: "C:/pilot", runCommand: async () => {} });
assert.equal(oversizedIssueNumber.status, "blocked");
assert.deepEqual(oversizedIssueNumber.configuration.invalidVariables,
  ["PATCH_PILOT_TYPESCRIPT_PILOT_ISSUE"]);
assert.equal(JSON.stringify(oversizedIssueNumber).includes("2147483648"), false);

await assert.rejects(assessPilotReadiness({}), /environment, project directory/u);
