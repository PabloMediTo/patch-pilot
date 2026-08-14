import { critiqueChangeProposal } from "../critiques/index.js";
import { verifyChangeProposal } from "../verifications/index.js";

const MAX_MODIFICATION_RETRIES = 2;

/**
 * Applies, verifies, critiques, and revises a proposal with at most two retries.
 *
 * @param {{ initialProposal: object, project: object, applyProposal: Function, executeCommand: Function, reviewProposal: Function, reviseProposal: Function }} input Proposal and attempt ports.
 * @returns {Promise<object>} Completed, rejected, or exhausted result with every attempt.
 * @throws {Error} When attempt ports or revised proposals violate their contracts.
 */
export async function executeProposalAttempts(input) {
  assertAttemptInput(input);
  const attempts = [];
  let proposal = input.initialProposal;

  for (let attemptNumber = 1; attemptNumber <= MAX_MODIFICATION_RETRIES + 1; attemptNumber += 1) {
    const attempt = await executeAttempt(input, proposal, attemptNumber);
    attempts.push(attempt);

    if (attempt.critique.decision === "accepted") {
      return createAttemptResult("completed", attempts, proposal);
    }
    if (attempt.critique.decision === "rejected") {
      return createAttemptResult("rejected", attempts, proposal);
    }
    if (attemptNumber > MAX_MODIFICATION_RETRIES) {
      return createAttemptResult("exhausted", attempts, proposal);
    }

    proposal = await input.reviseProposal(Object.freeze({
      previousProposal: proposal,
      verification: attempt.verification,
      critique: attempt.critique,
      nextPlanVersion: proposal.plan.version + 1,
    }));
    assertRevisedProposal(proposal, attempt.proposal.plan.version + 1);
  }

  throw new Error("Proposal attempt loop ended without a terminal outcome.");
}

/**
 * Applies, verifies, and critiques one visible proposal attempt.
 *
 * @param {object} input Attempt ports and project.
 * @param {object} proposal Current ready proposal.
 * @param {number} attemptNumber One-based attempt number.
 * @returns {Promise<object>} Immutable attempt evidence.
 */
async function executeAttempt(input, proposal, attemptNumber) {
  await input.applyProposal(Object.freeze({ attemptNumber, proposal }));
  const verification = await verifyChangeProposal({
    proposal,
    project: input.project,
    executeCommand: input.executeCommand,
  });
  const critique = await critiqueChangeProposal({
    proposal,
    verification,
    reviewProposal: input.reviewProposal,
  });
  return Object.freeze({ attemptNumber, proposal, verification, critique });
}

/**
 * Validates retry orchestration prerequisites.
 *
 * @param {object} input Attempt input.
 * @returns {void}
 * @throws {Error} When the proposal or a required port is invalid.
 */
function assertAttemptInput(input) {
  const ports = ["applyProposal", "executeCommand", "reviewProposal", "reviseProposal"];
  const hasPorts = ports.every((name) => typeof input?.[name] === "function");
  if (input?.initialProposal?.status !== "ready" || !hasPorts) {
    throw new Error("Proposal attempts require a ready proposal and all attempt ports.");
  }
}

/**
 * Ensures a retry produces a new ready proposal version.
 *
 * @param {unknown} proposal Revised proposal.
 * @param {number} expectedVersion Required plan version.
 * @returns {void}
 * @throws {Error} When revision is blocked or does not advance exactly once.
 */
function assertRevisedProposal(proposal, expectedVersion) {
  if (proposal?.status !== "ready" || proposal?.plan?.version !== expectedVersion) {
    throw new Error("A retry must produce a ready proposal with the next plan version.");
  }
}

/**
 * Creates an immutable attempt-loop result.
 *
 * @param {string} status Terminal status.
 * @param {object[]} attempts Completed attempts.
 * @param {object} proposal Final proposal.
 * @returns {object} Immutable result.
 */
function createAttemptResult(status, attempts, proposal) {
  return Object.freeze({ status, attempts: Object.freeze([...attempts]), proposal });
}
