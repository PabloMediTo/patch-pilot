import { posix } from "node:path";

import { assessChangeSafety, createMvpSafetyPolicy } from "../safety/index.js";

const MAX_PLAN_STEPS = 8;

/**
 * Generates one reviewable implementation plan and a safety-assessed source diff.
 *
 * @param {{ issue: object, reproduction: object, repositoryContext: object, generatePlan: Function, generateDiff: Function }} input Reproduced issue, inspected context, and structured generator ports.
 * @returns {Promise<object>} Ready or blocked immutable change proposal.
 * @throws {Error} When prerequisites or generator outputs are malformed.
 */
export async function createBoundedChangeProposal(input) {
  assertProposalPrerequisites(input);

  const generatedPlan = await input.generatePlan(Object.freeze({
    issue: input.issue,
    reproduction: input.reproduction,
    repositoryContext: input.repositoryContext,
    limits: Object.freeze({ maxSteps: MAX_PLAN_STEPS, maxFiles: 10 }),
  }));
  const plan = createPlan(generatedPlan);
  const generatedDiff = await input.generateDiff(Object.freeze({
    issue: input.issue,
    reproduction: input.reproduction,
    repositoryContext: input.repositoryContext,
    plan,
  }));
  const sourceDiff = createSourceDiff(generatedDiff);
  assertDiffMatchesPlan(sourceDiff, plan);

  const safety = assessChangeSafety({
    changes: sourceDiff.changes,
    policy: createMvpSafetyPolicy(),
  });

  return Object.freeze({
    status: safety.status === "allowed" ? "ready" : "blocked",
    plan,
    sourceDiff,
    safety,
  });
}

/**
 * Validates that planning starts only after successful failure reproduction.
 *
 * @param {object} input Proposal input.
 * @returns {void}
 * @throws {Error} When required input or generator ports are absent.
 */
function assertProposalPrerequisites(input) {
  const hasIssue = typeof input?.issue?.title === "string" && input.issue.title.trim() !== "";
  const hasContext = Array.isArray(input?.repositoryContext?.relevantFiles);
  const hasGenerators = typeof input?.generatePlan === "function"
    && typeof input?.generateDiff === "function";

  if (!hasIssue || !hasContext || !hasGenerators || input?.reproduction?.status !== "reproduced") {
    throw new Error("Change proposal requires a reproduced issue, repository context, and generator ports.");
  }
}

/**
 * Normalizes and freezes a bounded structured implementation plan.
 *
 * @param {unknown} candidate Generated plan candidate.
 * @returns {object} Immutable implementation plan.
 * @throws {Error} When the plan is malformed or exceeds its bounds.
 */
function createPlan(candidate) {
  const hasSummary = typeof candidate?.summary === "string" && candidate.summary.trim() !== "";
  const hasBoundedSteps = Array.isArray(candidate?.steps)
    && candidate.steps.length > 0
    && candidate.steps.length <= MAX_PLAN_STEPS;

  if (!hasSummary || !hasBoundedSteps) {
    throw new Error("Generated implementation plan is malformed or exceeds eight steps.");
  }

  const steps = candidate.steps.map((step, index) => createPlanStep(step, index));
  const plannedFiles = steps.flatMap((step) => step.files);
  if (new Set(plannedFiles).size !== plannedFiles.length) {
    throw new Error("Each planned file must be owned by exactly one implementation step.");
  }

  return Object.freeze({
    version: 1,
    summary: candidate.summary.trim(),
    steps: Object.freeze(steps),
  });
}

/**
 * Validates one plan step and its justified repository-relative files.
 *
 * @param {unknown} candidate Generated step candidate.
 * @param {number} index Zero-based step index.
 * @returns {object} Immutable plan step.
 * @throws {Error} When the step is incomplete or contains an unsafe path.
 */
function createPlanStep(candidate, index) {
  const hasDescription = typeof candidate?.description === "string"
    && candidate.description.trim() !== "";
  const hasRationale = typeof candidate?.rationale === "string" && candidate.rationale.trim() !== "";
  const hasFiles = Array.isArray(candidate?.files) && candidate.files.length > 0;
  if (!hasDescription || !hasRationale || !hasFiles) {
    throw new Error(`Generated implementation plan step ${index + 1} is malformed.`);
  }

  const files = candidate.files.map(normalizeRepositoryPath);
  return Object.freeze({
    sequence: index + 1,
    description: candidate.description.trim(),
    rationale: candidate.rationale.trim(),
    files: Object.freeze(files),
  });
}

/**
 * Creates review evidence from a unified source diff.
 *
 * @param {unknown} candidate Generated diff candidate.
 * @returns {object} Immutable diff and independently derived metrics.
 * @throws {Error} When the unified diff is absent or malformed.
 */
function createSourceDiff(candidate) {
  if (typeof candidate?.unifiedDiff !== "string" || candidate.unifiedDiff.trim() === "") {
    throw new Error("Generated source diff must contain a unified diff.");
  }

  const changes = parseUnifiedDiff(candidate.unifiedDiff);
  if (changes.length === 0) {
    throw new Error("Generated source diff does not contain a file patch.");
  }

  return Object.freeze({
    unifiedDiff: candidate.unifiedDiff,
    changes: Object.freeze(changes),
  });
}

/**
 * Derives changed paths and line counts from git-style unified diff text.
 *
 * @param {string} unifiedDiff Unified source patch.
 * @returns {object[]} Per-file change summaries.
 * @throws {Error} When headers or hunks are inconsistent.
 */
function parseUnifiedDiff(unifiedDiff) {
  const changes = [];
  let currentChange;
  let isInsideHunk = false;

  for (const line of unifiedDiff.split(/\r?\n/u)) {
    if (line.startsWith("diff --git ")) {
      currentChange = createDiffHeader(line);
      changes.push(currentChange);
      isInsideHunk = false;
    } else if (line.startsWith("@@ ")) {
      assertCurrentChange(currentChange);
      isInsideHunk = true;
    } else if (isInsideHunk && line.startsWith("+") && !line.startsWith("+++")) {
      currentChange.addedLines += 1;
    } else if (isInsideHunk && line.startsWith("-") && !line.startsWith("---")) {
      currentChange.deletedLines += 1;
    }
  }

  if (changes.some((change) => change.addedLines + change.deletedLines === 0)) {
    throw new Error("Every source diff file must contain at least one changed line.");
  }

  return changes.map((change) => Object.freeze(change));
}

/**
 * Parses and validates a git diff file header.
 *
 * @param {string} line Diff header line.
 * @returns {object} Mutable summary used only while parsing.
 * @throws {Error} When the header does not identify one unchanged path.
 */
function createDiffHeader(line) {
  const match = /^diff --git a\/(\S+) b\/(\S+)$/u.exec(line);
  if (match === null || match[1] !== match[2]) {
    throw new Error("Renames and malformed diff headers are outside the MVP.");
  }

  return { path: normalizeRepositoryPath(match[1]), addedLines: 0, deletedLines: 0 };
}

/**
 * Ensures a hunk belongs to a parsed file header.
 *
 * @param {object | undefined} currentChange Current parsed file.
 * @returns {void}
 * @throws {Error} When a hunk appears before a file header.
 */
function assertCurrentChange(currentChange) {
  if (currentChange === undefined) {
    throw new Error("Unified diff hunk appears before a file header.");
  }
}

/**
 * Normalizes one repository-relative POSIX path.
 *
 * @param {unknown} candidate Candidate path.
 * @returns {string} Normalized repository path.
 * @throws {Error} When the path escapes the repository or is absolute.
 */
function normalizeRepositoryPath(candidate) {
  if (typeof candidate !== "string" || candidate.trim() === "") {
    throw new Error("Plan and diff paths must be non-empty repository-relative strings.");
  }

  const normalized = posix.normalize(candidate.replaceAll("\\", "/"));
  const hasTraversal = normalized === ".." || normalized.startsWith("../");
  const hasAbsolutePath = normalized.startsWith("/") || /^[a-z]:\//iu.test(normalized);
  if (normalized === "." || hasTraversal || hasAbsolutePath) {
    throw new Error("Plan and diff paths must remain inside the repository.");
  }
  return normalized;
}

/**
 * Ensures the generated diff changes exactly the files justified by the plan.
 *
 * @param {object} sourceDiff Parsed source diff.
 * @param {object} plan Structured implementation plan.
 * @returns {void}
 * @throws {Error} When planned and changed file sets differ.
 */
function assertDiffMatchesPlan(sourceDiff, plan) {
  const plannedPaths = plan.steps.flatMap((step) => step.files).toSorted();
  const changedPaths = sourceDiff.changes.map((change) => change.path).toSorted();
  const hasMatchingPaths = plannedPaths.length === changedPaths.length
    && plannedPaths.every((path, index) => path === changedPaths[index]);
  if (!hasMatchingPaths) {
    throw new Error("Generated source diff must change exactly the files justified by the plan.");
  }
}
