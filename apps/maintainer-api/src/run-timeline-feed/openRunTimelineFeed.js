import { listRunTimeline } from "@patch-pilot/maintenance";

/**
 * Opens a gap-free ordered feed across persisted history and Redis live events.
 *
 * @param {{ runId: string, store: object, stream: object, emitEvent: Function }} input Timeline adapters and event receiver.
 * @returns {Promise<{ close: Function }>} Feed lifecycle handle.
 * @throws {Error} When feed input or received events are malformed.
 */
export async function openRunTimelineFeed(input) {
  assertFeedInput(input);
  const bufferedEvents = [];
  let isCatchingUp = true;
  let lastSequence = 0;

  const receiveLiveEvent = (event) => {
    assertTimelineEvent(event, input.runId);
    if (isCatchingUp) {
      bufferedEvents.push(event);
    } else if (event.sequence > lastSequence) {
      input.emitEvent(event);
      lastSequence = event.sequence;
    }
  };

  const unsubscribe = assertUnsubscribe(
    await input.stream.subscribe(input.runId, receiveLiveEvent),
  );
  try {
    const history = await listRunTimeline({ runId: input.runId, store: input.store });
    lastSequence = emitNewEvents(history, lastSequence, input.emitEvent);
    lastSequence = emitNewEvents(bufferedEvents, lastSequence, input.emitEvent);
    isCatchingUp = false;
  } catch (error) {
    await unsubscribe();
    throw error;
  }

  return Object.freeze({ close: unsubscribe });
}

/**
 * Validates the live subscription lifecycle contract.
 *
 * @param {unknown} candidate Candidate unsubscribe operation.
 * @returns {Function} Validated unsubscribe operation.
 * @throws {Error} When the stream cannot be closed independently.
 */
function assertUnsubscribe(candidate) {
  if (typeof candidate !== "function") {
    throw new Error("Run timeline subscription must return an unsubscribe operation.");
  }
  return candidate;
}

/**
 * Validates feed ports and identifiers.
 *
 * @param {object} input Feed input.
 * @returns {void}
 * @throws {Error} When required input is absent.
 */
function assertFeedInput(input) {
  const hasRunId = typeof input?.runId === "string" && input.runId.trim() !== "";
  const hasPorts = typeof input?.store?.list === "function"
    && typeof input?.stream?.subscribe === "function"
    && typeof input?.emitEvent === "function";
  if (!hasRunId || !hasPorts) {
    throw new Error("Run timeline feed requires a run ID, adapters, and event receiver.");
  }
}

/**
 * Emits ordered events newer than the last delivered sequence.
 *
 * @param {object[]} events Candidate events.
 * @param {number} lastSequence Last delivered sequence.
 * @param {Function} emitEvent Event receiver.
 * @returns {number} Latest delivered sequence.
 */
function emitNewEvents(events, lastSequence, emitEvent) {
  let latestSequence = lastSequence;
  const orderedEvents = [...events].sort((left, right) => left.sequence - right.sequence);
  for (const event of orderedEvents) {
    if (event.sequence > latestSequence) {
      emitEvent(event);
      latestSequence = event.sequence;
    }
  }
  return latestSequence;
}

/**
 * Validates one live event before it reaches an API consumer.
 *
 * @param {unknown} event Candidate event.
 * @param {string} runId Expected run identifier.
 * @returns {void}
 * @throws {Error} When identity or sequence is invalid.
 */
function assertTimelineEvent(event, runId) {
  if (event?.runId !== runId || !Number.isInteger(event?.sequence) || event.sequence < 1) {
    throw new Error("Run timeline stream returned a malformed or cross-run event.");
  }
}
