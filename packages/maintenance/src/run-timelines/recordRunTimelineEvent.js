/**
 * Persists one canonical run event and then publishes the stored event live.
 *
 * @param {{ runId: string, type: string, payload: object, store: object, stream: object, createId: Function, clock: Function }} input Event data and adapter ports.
 * @returns {Promise<object>} Persisted-and-streamed or persisted-stream-failed outcome.
 * @throws {Error} When input is malformed or canonical persistence fails.
 */
export async function recordRunTimelineEvent(input) {
  assertTimelineEventInput(input);
  const occurredAt = input.clock();
  if (!(occurredAt instanceof Date) || Number.isNaN(occurredAt.valueOf())) {
    throw new Error("Timeline clock must return a valid Date.");
  }

  const event = await input.store.append(Object.freeze({
    eventId: input.createId(),
    runId: input.runId,
    type: input.type,
    payload: cloneJson(input.payload),
    occurredAt: occurredAt.toISOString(),
  }));

  try {
    await input.stream.publish(event);
    return Object.freeze({ status: "persisted-and-streamed", event });
  } catch (error) {
    return Object.freeze({
      status: "persisted-stream-failed",
      event,
      streamError: Object.freeze({ message: createErrorMessage(error) }),
    });
  }
}

/**
 * Validates timeline event data and required ports.
 *
 * @param {object} input Candidate input.
 * @returns {void}
 * @throws {Error} When required values are absent or payload is not JSON data.
 */
function assertTimelineEventInput(input) {
  const hasIdentifiers = typeof input?.runId === "string" && input.runId.trim() !== ""
    && typeof input?.type === "string" && input.type.trim() !== "";
  const hasPayload = input?.payload !== null && typeof input?.payload === "object"
    && !Array.isArray(input.payload);
  const hasPorts = typeof input?.store?.append === "function"
    && typeof input?.stream?.publish === "function"
    && typeof input?.createId === "function"
    && typeof input?.clock === "function";
  if (!hasIdentifiers || !hasPayload || !hasPorts) {
    throw new Error("Timeline event requires run, type, JSON payload, and persistence ports.");
  }
}

/**
 * Copies JSON data and rejects circular or unsupported payloads.
 *
 * @param {object} value Payload value.
 * @returns {object} Detached JSON payload.
 * @throws {Error} When the payload cannot be serialized.
 */
function cloneJson(value) {
  try {
    return freezeJson(JSON.parse(JSON.stringify(value)));
  } catch {
    throw new Error("Timeline payload must be JSON serializable.");
  }
}

/**
 * Deeply freezes detached JSON evidence.
 *
 * @param {unknown} value JSON value.
 * @returns {unknown} Deeply immutable JSON value.
 */
function freezeJson(value) {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach(freezeJson);
    Object.freeze(value);
  }
  return value;
}

/**
 * Converts an unknown stream failure to safe evidence.
 *
 * @param {unknown} error Stream failure.
 * @returns {string} Safe failure message.
 */
function createErrorMessage(error) {
  return error instanceof Error ? error.message : "Unknown timeline stream failure.";
}
