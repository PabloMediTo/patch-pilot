import assert from "node:assert/strict";
import { Buffer } from "node:buffer";

import { createGitHubRepositoryAuthorization } from "./index.js";

const calls = [];
const authorizeRepository = createGitHubRepositoryAuthorization({
  getInstallationToken: async (target) => {
    calls.push(target);
    return "installation-secret";
  },
});

assert.equal(await authorizeRepository({ installationId: 17, repository: "octo/example" }),
  `Basic ${Buffer.from("x-access-token:installation-secret").toString("base64")}`);
assert.deepEqual(calls, [{ installationId: 17, repository: "octo/example" }]);
await assert.rejects(authorizeRepository({ installationId: 0, repository: "octo/example" }),
  /requires an installation and repository/u);

const unsafeAuthorization = createGitHubRepositoryAuthorization({
  getInstallationToken: async () => " ",
});
await assert.rejects(unsafeAuthorization({ installationId: 17, repository: "octo/example" }),
  /invalid token/u);
