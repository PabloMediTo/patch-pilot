import { openRunTimelineFeed } from "./openRunTimelineFeed.js";

const HEARTBEAT_INTERVAL_MS = 15_000;

/**
 * Exposes one run timeline feed through an SSE response port.
 *
 * @param {{ runId: string, afterSequence?: number, store: object, stream: object, response: object, scheduleHeartbeat: Function }} input Feed adapters, response, resume point, and timer port.
 * @returns {Promise<{ close: Function }>} Idempotent session lifecycle handle.
 * @throws {Error} When response or timer ports are malformed.
 */
export async function openRunTimelineSseSession(input) {
  assertSseInput(input);
  let feed;
  let cancelHeartbeat;
  let isClosed = false;

  const close = async () => {
    if (isClosed) return;
    isClosed = true;
    cancelHeartbeat?.();
    await feed?.close();
  };

  input.response.start(Object.freeze({
    statusCode: 200,
    headers: Object.freeze({
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "content-type": "text/event-stream; charset=utf-8",
    }),
  }));
  input.response.onClose(() => { void close(); });

  feed = await openRunTimelineFeed({
    runId: input.runId,
    afterSequence: input.afterSequence,
    store: input.store,
    stream: input.stream,
    emitEvent: (event) => input.response.write(createEventFrame(event)),
  });

  if (isClosed) {
    await feed.close();
  } else {
    cancelHeartbeat = input.scheduleHeartbeat(
      () => input.response.write(": heartbeat\n\n"),
      HEARTBEAT_INTERVAL_MS,
    );
  }
  return Object.freeze({ close });
}

/**
 * Validates transport-specific ports.
 *
 * @param {object} input SSE session input.
 * @returns {void}
 * @throws {Error} When response or timer operations are absent.
 */
function assertSseInput(input) {
  const hasResponse = typeof input?.response?.start === "function"
    && typeof input?.response?.write === "function"
    && typeof input?.response?.onClose === "function";
  if (!hasResponse || typeof input?.scheduleHeartbeat !== "function") {
    throw new Error("Timeline SSE session requires response and heartbeat ports.");
  }
}

/**
 * Formats one canonical timeline event as an SSE frame.
 *
 * @param {object} event Canonical timeline event.
 * @returns {string} SSE frame.
 */
function createEventFrame(event) {
  return `id: ${event.sequence}\nevent: timeline\ndata: ${JSON.stringify(event)}\n\n`;
}
