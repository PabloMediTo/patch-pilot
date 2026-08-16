import assert from "node:assert/strict";

import { createOpenAiProposalGenerators } from "./index.js";

const calls = [];
const outputs = [{ summary: "Fix addition.", steps: [{ description: "Correct addition.",
  rationale: "The source causes the reproduced failure.", files: ["src/math.ts"] }] },
{ unifiedDiff: "diff --git a/src/math.ts b/src/math.ts\n@@ -1 +1 @@\n-3\n+2" }];
const generators = createOpenAiProposalGenerators({ apiKey: "private-test-key",
  model: "controlled-model", fetchResponse: async (url, request) => {
    calls.push({ url, request });
    return { ok: true, status: 200, text: async () => JSON.stringify({ output: [{
      content: [{ type: "output_text", text: JSON.stringify(outputs.shift()) }],
    }] }) };
  } });

const plan = await generators.generatePlan({ issue: { title: "Broken addition" } });
const diff = await generators.generateDiff({ plan });
assert.equal(plan.steps[0].files[0], "src/math.ts");
assert.match(diff.unifiedDiff, /diff --git/u);
assert.equal(calls.length, 2);
assert.equal(calls[0].url, "https://api.openai.com/v1/responses");
const planBody = JSON.parse(calls[0].request.body);
assert.equal(planBody.model, "controlled-model");
assert.equal(planBody.store, false);
assert.equal(planBody.text.format.type, "json_schema");
assert.equal(planBody.text.format.strict, true);
assert.equal(calls[0].request.headers.authorization, "Bearer private-test-key");
assert.doesNotMatch(calls[0].request.body, /private-test-key/u);

await assert.rejects(createOpenAiProposalGenerators({ apiKey: "key",
  fetchResponse: async () => ({ ok: false, status: 429,
    text: async () => "rate limit details" }) }).generatePlan({}), /HTTP 429/u);
await assert.rejects(createOpenAiProposalGenerators({ apiKey: "key",
  fetchResponse: async () => ({ ok: true, status: 200,
    text: async () => JSON.stringify({ output: [{ content: [{ type: "refusal" }] }] }) })
}).generatePlan({}), /refused/u);
assert.throws(() => createOpenAiProposalGenerators({ apiKey: " " }), /API key/u);
