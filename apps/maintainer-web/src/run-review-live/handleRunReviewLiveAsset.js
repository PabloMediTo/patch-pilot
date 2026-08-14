const ASSET_PATH = "/assets/run-review-live.js";

const CLIENT_SCRIPT = `(() => {
  const root = document.querySelector("main[data-run-id]");
  const list = document.querySelector("[data-live-timeline]");
  if (!root || !list || typeof EventSource !== "function") return;
  const source = new EventSource("/runs/" + encodeURIComponent(root.dataset.runId) + "/timeline");
  source.addEventListener("timeline", (message) => {
    const event = JSON.parse(message.data);
    if (list.querySelector('[data-sequence="' + event.sequence + '"]')) return;
    const item = document.createElement("li");
    const type = document.createElement("strong");
    const time = document.createElement("time");
    item.dataset.sequence = String(event.sequence);
    type.textContent = event.type;
    time.textContent = event.occurredAt;
    item.append(type, " ", time);
    list.append(item);
  });
})();`;

/**
 * Serves the same-origin browser timeline client.
 *
 * @param {{ request: object, response: object }} input HTTP ports.
 * @returns {object} Route outcome.
 */
export function handleRunReviewLiveAsset(input) {
  if (input?.request?.url !== ASSET_PATH) return Object.freeze({ status: "unhandled" });
  if (input.request.method !== "GET") {
    input.response.writeHead(405, { allow: "GET" });
    input.response.end();
    return Object.freeze({ status: "rejected", statusCode: 405 });
  }
  input.response.writeHead(200, {
    "content-type": "text/javascript; charset=utf-8",
    "cache-control": "public, max-age=3600",
    "x-content-type-options": "nosniff",
  });
  input.response.end(CLIENT_SCRIPT);
  return Object.freeze({ status: "served" });
}
