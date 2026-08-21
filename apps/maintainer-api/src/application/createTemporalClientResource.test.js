import assert from "node:assert/strict";

import { createTemporalClientResource } from "./createTemporalClientResource.js";

const connection = { closeCalls: 0,
  close() { this.closeCalls += 1; return Promise.resolve(); } };
const client = { workflow: { start: async () => undefined, getHandle: () => ({}) } };
const resource = await createTemporalClientResource({ address: "127.0.0.1:7233",
  namespace: "default", connection, client });
assert.equal(resource.client, client);
await resource.close();
await resource.close();
assert.equal(connection.closeCalls, 1);
await assert.rejects(createTemporalClientResource({}), /address and namespace/u);
await assert.rejects(createTemporalClientResource({ address: "localhost:7233",
  namespace: "default", connection: {} }), /closeable/u);
await assert.rejects(createTemporalClientResource({ address: "localhost:7233",
  namespace: "default", connection, client: {} }), /start and handle/u);
