import { Buffer } from "node:buffer";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.4-mini-2026-03-17";
const MAX_RESPONSE_BYTES = 524_288;
const REQUEST_TIMEOUT_MS = 120_000;

const PLAN_SCHEMA = Object.freeze({
  type: "object", additionalProperties: false, required: ["summary", "steps"],
  properties: {
    summary: { type: "string", minLength: 1 },
    steps: { type: "array", minItems: 1, maxItems: 8, items: {
      type: "object", additionalProperties: false,
      required: ["description", "rationale", "files"],
      properties: {
        description: { type: "string", minLength: 1 },
        rationale: { type: "string", minLength: 1 },
        files: { type: "array", minItems: 1, maxItems: 10,
          items: { type: "string", minLength: 1 } },
      },
    } },
  },
});
const DIFF_SCHEMA = Object.freeze({ type: "object", additionalProperties: false,
  required: ["unifiedDiff"], properties: { unifiedDiff: { type: "string", minLength: 1 } } });
const CRITIQUE_SCHEMA = Object.freeze({ type: "object", additionalProperties: false,
  required: ["decision", "rationale", "findings"], properties: {
    decision: { type: "string", enum: ["accepted", "retry", "rejected"] },
    rationale: { type: "string", minLength: 1 },
    findings: { type: "array", maxItems: 10, items: { type: "object",
      additionalProperties: false, required: ["severity", "message"], properties: {
        severity: { type: "string", enum: ["warning", "blocking"] },
        message: { type: "string", minLength: 1 },
      } } },
  } });

/**
 * Creates structured plan and diff generators backed by the OpenAI Responses API.
 *
 * @param {{ apiKey: string, model?: string, endpoint?: string, fetchResponse?: Function }} input Provider configuration and HTTP port.
 * @returns {{ generatePlan: Function, generateDiff: Function, reviewProposal: Function }} Immutable proposal-generator ports.
 */
export function createOpenAiProposalGenerators(input) {
  assertConfiguration(input);
  const request = createRequester({ apiKey: input.apiKey.trim(),
    model: input.model?.trim() || DEFAULT_MODEL,
    endpoint: input.endpoint?.trim() || RESPONSES_URL,
    fetchResponse: input.fetchResponse ?? globalThis.fetch });
  return Object.freeze({
    generatePlan: (context) => request({ name: "patch_pilot_plan", schema: PLAN_SCHEMA,
      maxOutputTokens: 8_000, system: PLAN_INSTRUCTIONS, context }),
    generateDiff: (context) => request({ name: "patch_pilot_diff", schema: DIFF_SCHEMA,
      maxOutputTokens: 16_000, system: DIFF_INSTRUCTIONS, context }),
    reviewProposal: (context) => request({ name: "patch_pilot_critique", schema: CRITIQUE_SCHEMA,
      maxOutputTokens: 4_000, system: CRITIQUE_INSTRUCTIONS, context }),
  });
}

const PLAN_INSTRUCTIONS = `Create the smallest implementation plan that fixes the reproduced issue.
Use only supplied repository files. Every file must be repository-relative and owned by one step.
Do not plan dependency, lockfile, generated, migration, secret, key, or certificate changes.
When revisionEvidence is present, replace the prior proposal and address its verification and critique.`;
const DIFF_INSTRUCTIONS = `Produce one git-style unified diff implementing the validated plan.
Change exactly the planned files, keep paths repository-relative, include diff --git headers and hunks,
and do not rename files. When revisionEvidence is present, produce a complete patch against the original
repository context rather than an incremental patch. Return only the schema-defined value.`;
const CRITIQUE_INSTRUCTIONS = `Review the verified proposal for issue fit, scope, regression risk,
and plan-to-diff consistency. Accept only when verification passed and no blocking finding remains.
Request retry for correctable defects and reject unsafe or unsuitable changes.`;

/** Creates one bounded structured-output requester. */
function createRequester(config) {
  return async (request) => {
    const response = await config.fetchResponse(config.endpoint, {
      method: "POST", headers: { authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json" },
      signal: globalThis.AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify(createRequestBody(config.model, request)),
    });
    const body = await readBoundedBody(response);
    if (!response?.ok) throw new Error(`OpenAI proposal generation failed with HTTP ${response?.status}.`);
    return parseStructuredOutput(body);
  };
}

/** Creates one Responses API request with strict JSON Schema output. */
function createRequestBody(model, request) {
  return Object.freeze({ model, store: false, max_output_tokens: request.maxOutputTokens,
    input: Object.freeze([{ role: "system", content: request.system },
      { role: "user", content: JSON.stringify(request.context) }]),
    text: Object.freeze({ format: Object.freeze({ type: "json_schema", name: request.name,
      strict: true, schema: request.schema }) }) });
}

/** Reads one provider response without accepting an unbounded body. */
async function readBoundedBody(response) {
  if (typeof response?.text !== "function") throw new Error("OpenAI response is invalid.");
  const body = await response.text();
  if (Buffer.byteLength(body, "utf8") > MAX_RESPONSE_BYTES) {
    throw new Error("OpenAI response exceeds the proposal-generation limit.");
  }
  return body;
}

/** Extracts and parses the first structured output text item. */
function parseStructuredOutput(body) {
  let response;
  try { response = JSON.parse(body); } catch { throw new Error("OpenAI response is not valid JSON."); }
  const content = response?.output?.flatMap((item) => item?.content ?? []) ?? [];
  if (content.some((item) => item?.type === "refusal")) {
    throw new Error("OpenAI refused proposal generation.");
  }
  const output = content.find((item) => item?.type === "output_text")?.text;
  if (typeof output !== "string" || output.trim() === "") {
    throw new Error("OpenAI response contains no structured output.");
  }
  try { return JSON.parse(output); } catch { throw new Error("OpenAI structured output is invalid JSON."); }
}

/** Requires one secret credential and one usable HTTP port. */
function assertConfiguration(input) {
  if (typeof input?.apiKey !== "string" || input.apiKey.trim() === ""
    || (input.fetchResponse !== undefined && typeof input.fetchResponse !== "function")
    || typeof (input.fetchResponse ?? globalThis.fetch) !== "function") {
    throw new Error("OpenAI proposal generation requires an API key and fetch port.");
  }
}
