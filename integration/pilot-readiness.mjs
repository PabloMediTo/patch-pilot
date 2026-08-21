const REQUIRED_VALUES = Object.freeze([
  "PATCH_PILOT_OPENAI_API_KEY",
  "PATCH_PILOT_GITHUB_APP_PRIVATE_KEY",
  "PATCH_PILOT_GITHUB_WEBHOOK_SECRET",
  "PATCH_PILOT_API_ACTOR_ID",
]);
const VALIDATED_VALUES = Object.freeze({
  PATCH_PILOT_API_BEARER_TOKEN: (value) => value.length >= 32,
  PATCH_PILOT_GITHUB_APP_ID: (value) => /^[1-9][0-9]*$/u.test(value),
  PATCH_PILOT_PYTHON_PILOT_REPOSITORY: isRepository,
  PATCH_PILOT_PYTHON_PILOT_ISSUE: isPositiveInteger,
  PATCH_PILOT_TYPESCRIPT_PILOT_REPOSITORY: isRepository,
  PATCH_PILOT_TYPESCRIPT_PILOT_ISSUE: isPositiveInteger,
});

/**
 * Assesses whether this machine has the tooling, credentials, and targets for both MVP pilots.
 *
 * @param {{ environment: object, projectDirectory: string, runCommand: Function }} input Controlled environment and process port.
 * @returns {Promise<object>} Sanitized ready or blocked report without configuration values.
 */
export async function assessPilotReadiness(input) {
  assertInput(input);
  const tooling = await assessTooling(input.runCommand, input.projectDirectory);
  const configuration = assessConfiguration(input.environment);
  const hasBlocker = tooling.status === "blocked" || configuration.status === "blocked";
  return Object.freeze({ status: hasBlocker ? "blocked" : "ready", tooling, configuration });
}

/** Checks the Docker engine, Compose command, and repository Compose model. */
async function assessTooling(runCommand, projectDirectory) {
  const commands = [
    ["docker-engine", ["version", "--format", "{{.Server.Version}}"]],
    ["docker-compose", ["compose", "version", "--short"]],
    ["compose-config", ["compose", "config", "--quiet"]],
  ];
  const checks = [];
  for (const [name, args] of commands) {
    checks.push(await checkCommand({ name, args, runCommand, projectDirectory }));
  }
  const hasFailure = checks.some((check) => check.status === "blocked");
  return Object.freeze({ status: hasFailure ? "blocked" : "ready",
    checks: Object.freeze(checks) });
}

/** Executes one exact tool command and converts failure to non-sensitive evidence. */
async function checkCommand(input) {
  try {
    await input.runCommand("docker", input.args, { cwd: input.projectDirectory });
    return Object.freeze({ name: input.name, status: "ready" });
  } catch {
    return Object.freeze({ name: input.name, status: "blocked",
      reason: `${input.name}-unavailable` });
  }
}

/** Reports missing and malformed configuration names without exposing their values. */
function assessConfiguration(environment) {
  const missingValidatedValues = Object.keys(VALIDATED_VALUES)
    .filter((name) => !hasValue(environment[name]));
  const missingVariables = [...REQUIRED_VALUES
    .filter((name) => !hasValue(environment[name])), ...missingValidatedValues];
  const invalidVariables = Object.entries(VALIDATED_VALUES)
    .filter(([name, validator]) => hasValue(environment[name])
      && !validator(environment[name].trim()))
    .map(([name]) => name);
  const hasFailure = missingVariables.length > 0 || invalidVariables.length > 0;
  return Object.freeze({ status: hasFailure ? "blocked" : "ready",
    missingVariables: Object.freeze(missingVariables),
    invalidVariables: Object.freeze(invalidVariables) });
}

/** Requires controlled inputs so the readiness check never owns shell interpretation. */
function assertInput(input) {
  if (typeof input?.environment !== "object" || input.environment === null
    || typeof input.projectDirectory !== "string" || input.projectDirectory.trim() === ""
    || typeof input.runCommand !== "function") {
    throw new Error("Pilot readiness requires environment, project directory, and process ports.");
  }
}

/** Identifies a non-empty configuration value. */
function hasValue(value) {
  return typeof value === "string" && value.trim() !== "";
}

/** Validates one exact owner/name GitHub repository identity. */
function isRepository(value) {
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(value);
}

/** Validates one decimal positive integer without coercion. */
function isPositiveInteger(value) {
  return /^[1-9][0-9]*$/u.test(value);
}
