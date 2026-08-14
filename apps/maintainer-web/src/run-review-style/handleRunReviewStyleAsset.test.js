import assert from "node:assert/strict";

import { handleRunReviewStyleAsset } from "./index.js";

const response = createResponse();
assert.equal(handleRunReviewStyleAsset({ request: { method: "GET", url: "/health" }, response }).status, "unhandled");
assert.equal(handleRunReviewStyleAsset({ request: { method: "POST", url: "/assets/run-review.css" }, response }).statusCode, 405);
const served = handleRunReviewStyleAsset({ request: { method: "GET", url: "/assets/run-review.css" }, response });
assert.equal(served.status, "served");
assert.equal(response.headers["content-type"], "text/css; charset=utf-8");
assert.match(response.body, /\.addition/u);
assert.match(response.body, /@media/u);

/** Creates a response fixture. */
function createResponse() {
  return { writeHead(code, headers) { this.code = code; this.headers = headers; }, end(body) { this.body = body; } };
}
