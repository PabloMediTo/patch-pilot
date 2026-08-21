const EXPECTED_TYPES = Object.freeze(["run.submitted", "reproduction.completed"]);
const EXPECTED_SEQUENCES = Object.freeze([1, 2]);
const EXPECTED_ORDINALS = Object.freeze([1, 2]);

/**
 * Verifies sanitized evidence collected through the real Postgres and Redis adapters.
 *
 * @param {{ recordResults: object[], liveEvents: object[], history: object[] }} evidence Provider evidence.
 * @returns {object} Sanitized live-proof report.
 */
export function verifyTimelineIntegrationEvidence(evidence) {
  assertEvidenceShape(evidence);
  assertRecordResults(evidence.recordResults);
  assertCanonicalEvents(evidence.history, "Postgres history");
  assertCanonicalEvents(evidence.liveEvents, "Redis delivery");

  const historyIds = evidence.history.map(({ eventId }) => eventId);
  const liveIds = evidence.liveEvents.map(({ eventId }) => eventId);
  if (!hasUniqueNonEmptyStrings(historyIds) || !sameValues(liveIds, historyIds)) {
    throw new Error("Timeline integration provider event identities do not match.");
  }

  return Object.freeze({ status: "passed", checks: Object.freeze([
    createPassedCheck("postgres-persistence"),
    createPassedCheck("postgres-ordering"),
    createPassedCheck("redis-delivery"),
    createPassedCheck("provider-identity-match"),
  ]) });
}

/** Requires exactly the evidence emitted by the two-event live probe. */
function assertEvidenceShape(evidence) {
  if (!Array.isArray(evidence?.recordResults) || evidence.recordResults.length !== 2
    || !Array.isArray(evidence.liveEvents) || evidence.liveEvents.length !== 2
    || !Array.isArray(evidence.history) || evidence.history.length !== 2) {
    throw new Error("Timeline integration requires two persisted and two delivered events.");
  }
}

/** Requires persistence and streaming to have succeeded for both writes. */
function assertRecordResults(results) {
  if (!results.every((result) => result?.status === "persisted-and-streamed")) {
    throw new Error("Timeline integration did not persist and stream every event.");
  }
}

/** Requires one provider view to preserve canonical order and bounded probe payloads. */
function assertCanonicalEvents(events, provider) {
  const hasExpectedEvidence = sameValues(events.map(({ sequence }) => sequence), EXPECTED_SEQUENCES)
    && sameValues(events.map(({ type }) => type), EXPECTED_TYPES)
    && sameValues(events.map(({ payload }) => payload?.ordinal), EXPECTED_ORDINALS)
    && events.every(({ payload }) => payload?.integration === true);
  if (!hasExpectedEvidence) {
    throw new Error(`${provider} does not contain the canonical timeline evidence.`);
  }
}

/** Compares two short ordered evidence vectors without coercion. */
function sameValues(actual, expected) {
  return actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

/** Rejects missing or duplicated provider identities. */
function hasUniqueNonEmptyStrings(values) {
  return values.every((value) => typeof value === "string" && value.trim() !== "")
    && new Set(values).size === values.length;
}

/** Creates one sanitized successful check entry. */
function createPassedCheck(name) {
  return Object.freeze({ name, status: "passed" });
}
