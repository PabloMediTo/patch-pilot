import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { bundleWorkflowCode } from "@temporalio/worker";

import { createMaintainerWorkerDeployment } from "./index.js";

const connection = createCloseable();
const timelineStore = { append: async () => undefined, ...createCloseable() };
const timelineStream = { publish: async () => undefined, ...createCloseable() };
const reviewStore = { saveSnapshot: async () => undefined, ...createCloseable() };
const worker = { runCalls: 0, shutdownCalls: 0,
  async run() { this.runCalls += 1; },
  shutdown() { this.shutdownCalls += 1; } };
const proposalGenerators = { generatePlan: async () => undefined,
  generateDiff: async () => undefined, reviewProposal: async () => undefined };
const environment = { PATCH_PILOT_OPENAI_API_KEY: "private-test-key" };
const deployment = await createMaintainerWorkerDeployment({ environment, connection,
  timelineStore, timelineStream, reviewStore, proposalGenerators, worker });

await deployment.run();
await deployment.close();
await deployment.close();
assert.equal(worker.runCalls, 1);
assert.equal(worker.shutdownCalls, 1);
assert.equal(connection.closeCalls, 1);
assert.equal(timelineStore.closeCalls, 1);
assert.equal(timelineStream.closeCalls, 1);
assert.equal(reviewStore.closeCalls, 1);
assert.throws(() => deployment.run(), /closing/u);

await assert.rejects(createMaintainerWorkerDeployment({
  environment: { PATCH_PILOT_TEMPORAL_TASK_QUEUE: " " }, connection,
  timelineStore, timelineStream, reviewStore, proposalGenerators, worker }), /valid Temporal/u);

await assert.rejects(createMaintainerWorkerDeployment({ environment: {}, connection,
  timelineStore, timelineStream, reviewStore, proposalGenerators, worker }), /OpenAI values/u);

const workflowsPath = fileURLToPath(new URL("../maintenance-workflow/maintenanceRunWorkflow.js",
  import.meta.url));
const bundle = await bundleWorkflowCode({ workflowsPath });
assert.ok(bundle.code.includes("maintenanceRunWorkflow"));

/** Creates one idempotence-observable provider resource. */
function createCloseable() {
  return { closeCalls: 0, async close() { this.closeCalls += 1; } };
}
