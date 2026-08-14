import assert from "node:assert/strict";

import { executeProposalAttempts } from "./executeProposalAttempts.js";

const project = Object.freeze({
  workspaceDirectory: "C:/workspace",
  command: Object.freeze({ executable: "npm", args: Object.freeze(["test"]) }),
});

await runTest("completes after passing verification and accepted critique", async () => {
  const applied = [];
  const result = await executeProposalAttempts({
    initialProposal: createProposal(1),
    project,
    applyProposal: async (request) => applied.push(request.attemptNumber),
    executeCommand: async () => createExecution(0),
    reviewProposal: async () => ({ decision: "accepted", rationale: "Focused and verified.", findings: [] }),
    reviseProposal: async () => createProposal(2),
  });

  assert.equal(result.status, "completed");
  assert.deepEqual(applied, [1]);
  assert.equal(result.attempts.length, 1);
  assert.equal(result.attempts[0].verification.status, "passed");
  assert.ok(Object.isFrozen(result.attempts));
});

await runTest("retries failed verification and preserves every attempt", async () => {
  let executions = 0;
  const result = await executeProposalAttempts({
    initialProposal: createProposal(1),
    project,
    applyProposal: async () => undefined,
    executeCommand: async () => {
      executions += 1;
      return createExecution(executions === 1 ? 1 : 0);
    },
    reviewProposal: async () => ({ decision: "accepted", rationale: "Regression risk addressed.", findings: [] }),
    reviseProposal: async ({ nextPlanVersion }) => createProposal(nextPlanVersion),
  });

  assert.equal(result.status, "completed");
  assert.equal(result.attempts.length, 2);
  assert.equal(result.attempts[0].critique.reason, "verification-failed");
  assert.equal(result.attempts[1].proposal.plan.version, 2);
});

await runTest("stops after two modification retries", async () => {
  let revisions = 0;
  const result = await executeProposalAttempts({
    initialProposal: createProposal(1),
    project,
    applyProposal: async () => undefined,
    executeCommand: async () => createExecution(1),
    reviewProposal: async () => ({ decision: "accepted", rationale: "Unused.", findings: [] }),
    reviseProposal: async ({ nextPlanVersion }) => {
      revisions += 1;
      return createProposal(nextPlanVersion);
    },
  });

  assert.equal(result.status, "exhausted");
  assert.equal(result.attempts.length, 3);
  assert.equal(revisions, 2);
});

await runTest("rejects infrastructure evidence without consuming a modification retry", async () => {
  let hasRevised = false;
  let hasReviewed = false;
  const result = await executeProposalAttempts({
    initialProposal: createProposal(1),
    project,
    applyProposal: async () => undefined,
    executeCommand: async () => ({ ...createExecution(1), hasTimedOut: true }),
    reviewProposal: async () => {
      hasReviewed = true;
      return {};
    },
    reviseProposal: async () => {
      hasRevised = true;
      return createProposal(2);
    },
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.attempts[0].critique.reason, "verification-execution-failed");
  assert.equal(hasReviewed, false);
  assert.equal(hasRevised, false);
});

await runTest("rejects an accepted critique with a blocking finding", async () => {
  await assert.rejects(
    executeProposalAttempts({
      initialProposal: createProposal(1),
      project,
      applyProposal: async () => undefined,
      executeCommand: async () => createExecution(0),
      reviewProposal: async () => ({
        decision: "accepted",
        rationale: "Contradictory review.",
        findings: [{ severity: "blocking", message: "Uncovered regression." }],
      }),
      reviseProposal: async () => createProposal(2),
    }),
    /cannot contain blocking findings/u,
  );
});

/**
 * Creates a minimal ready proposal for one version.
 *
 * @param {number} version Plan version.
 * @returns {object} Proposal fixture.
 */
function createProposal(version) {
  return Object.freeze({
    status: "ready",
    plan: Object.freeze({ version, summary: "Fix bug.", steps: Object.freeze([]) }),
    sourceDiff: Object.freeze({ unifiedDiff: "diff", changes: Object.freeze([]) }),
    safety: Object.freeze({ status: "allowed", reasons: Object.freeze([]) }),
  });
}

/**
 * Creates bounded executor evidence.
 *
 * @param {number} exitCode Process exit code.
 * @returns {object} Execution fixture.
 */
function createExecution(exitCode) {
  return {
    exitCode,
    stdout: exitCode === 0 ? "passed" : "failed",
    stderr: "",
    durationMs: 10,
    hasTimedOut: false,
    hasTruncatedOutput: false,
  };
}

/**
 * Executes one named assertion group.
 *
 * @param {string} name Human-readable group name.
 * @param {Function} assertionGroup Assertions to execute.
 * @returns {Promise<void>} Completion after assertions pass.
 */
async function runTest(name, assertionGroup) {
  assert.notEqual(name.trim(), "");
  await assertionGroup();
}
