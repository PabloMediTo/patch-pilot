import assert from "node:assert/strict";

import { handleRunReviewLiveAsset } from "./index.js";

const response = createResponse();
assert.equal(handleRunReviewLiveAsset({ request: { method: "GET", url: "/health" }, response }).status, "unhandled");
assert.equal(handleRunReviewLiveAsset({ request: { method: "POST", url: "/assets/run-review-live.js" }, response }).statusCode, 405);
const served = handleRunReviewLiveAsset({ request: { method: "GET", url: "/assets/run-review-live.js" }, response });
assert.equal(served.status, "served");
assert.match(response.body, /new EventSource/u);
assert.match(response.body, /addEventListener\("timeline"/u);
assert.match(response.body, /textContent = event\.type/u);
assert.doesNotMatch(response.body, /innerHTML/u);
assert.match(response.body, /data-sequence/u);

/** Creates a response fixture. */
function createResponse() {
  return { writeHead(code, headers) { this.code = code; this.headers = headers; }, end(body) { this.body = body; } };
}
