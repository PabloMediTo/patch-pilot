import { createRunReviewSnapshot } from "./createRunReviewSnapshot.js";

/**
 * Creates and atomically records one immutable human-review snapshot.
 *
 * @param {{ run: object, proposal: object, verification: object, critique: object, recordedAt: string, saveSnapshot: Function }} input Accepted attempt evidence and persistence port.
 * @returns {Promise<object>} Created, replayed, or conflicting persistence outcome.
 */
export async function recordRunReviewSnapshot(input) {
  if (typeof input?.saveSnapshot !== "function") {
    throw new Error("Review snapshot recording requires an atomic persistence port.");
  }
  const expected = createRunReviewSnapshot(input);
  const outcome = await input.saveSnapshot(expected);
  if (outcome?.status === "created") {
    assertReturnedSnapshot(outcome.snapshot, expected);
    return Object.freeze({ status: "created", snapshot: outcome.snapshot });
  }
  if (outcome?.status === "existing" && hasSameEvidence(outcome.snapshot, expected)) {
    return Object.freeze({ status: "existing", snapshot: outcome.snapshot });
  }
  return Object.freeze({ status: "conflict", snapshot: outcome?.snapshot ?? null });
}

/** Requires stores to return the exact row they reported as created. */
function assertReturnedSnapshot(actual, expected) {
  if (!hasSameEvidence(actual, expected)) {
    throw new Error("Review snapshot store returned different created evidence.");
  }
}

/** Compares nested JSON evidence independently from object property ordering. */
function hasSameEvidence(actual, expected) {
  return actual !== null && typeof actual === "object"
    && stableJson(actual) === stableJson(expected);
}

/** Produces one canonical JSON representation for bounded snapshot evidence. */
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
