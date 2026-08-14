import assert from "node:assert/strict";

import { hasValidGitHubWebhookSignature } from "./index.js";

assert.equal(
  hasValidGitHubWebhookSignature({
    secret: "It's a Secret to Everybody",
    rawBody: "Hello, World!",
    signature: "sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17",
  }),
  true,
);

assert.equal(
  hasValidGitHubWebhookSignature({
    secret: "It's a Secret to Everybody",
    rawBody: "tampered",
    signature: "sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17",
  }),
  false,
);
