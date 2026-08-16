# Proposal Generation

## Responsibility

Translate bounded issue, reproduction, and repository evidence into the structured plan and unified diff required by the provider-free [change proposal](../DICTIONARY.md#change-proposal) boundary.

## Not responsible for

- selecting repository files outside the bounded planning context
- trusting generator-supplied change metrics or safety claims
- applying the generated diff or executing target-repository commands
- retaining provider credentials in Temporal history or timeline events
- approving or publishing a proposal

## Inputs

- immutable issue title and descriptive context
- accepted failure-reproduction evidence
- bounded [repository planning context](../DICTIONARY.md#repository-planning-context)
- worker-owned OpenAI API key and configurable model snapshot

## Outputs

- a JSON-Schema-constrained plan candidate with at most eight steps and ten files
- a JSON-Schema-constrained git-style unified diff candidate
- provider failures that remain visible to Temporal Activity retry and failure handling

## Adjacent parts

- [maintenance worker runtime](maintenance-worker-runtime.md) owns provider configuration and Activity composition
- [change proposals](change-proposals.md) validate plan structure, parse the diff independently, require exact traceability, and apply safety policy
- [maintenance workflow](maintenance-workflow.md) records proposal lifecycle evidence
- [run timelines](run-timelines.md) retain plan and changed-file summaries but not the source diff

## Provider contract

The worker uses the OpenAI Responses API through its native HTTP port. Requests set `store: false` and require strict JSON Schema output. The default model is the pinned `gpt-5.4-mini-2026-03-17` snapshot and can be replaced through `PATCH_PILOT_OPENAI_MODEL` without changing the maintenance-domain ports. `PATCH_PILOT_OPENAI_API_KEY` is required only by the executable worker and is sent in the authorization header, never in prompts, Activity input, returned evidence, or error messages.

Plan and diff generation are separate requests. A third strict-schema request critiques only proposals whose verification passed. Failed verification produces a deterministic retry without spending a reviewer request. Revision requests include the prior plan, verification, and critique and require a complete replacement patch against the original context. Responses are bounded to 512 KiB before parsing, HTTP errors expose only status codes, refusals are explicit failures, and every structured result is validated again by the provider-free change-proposal or critique boundary.

## Durable evidence boundary

Full planning context and generated proposal remain in Temporal workflow history because they cross Activity boundaries. Timeline events record proposal status, plan version and summary, planned paths, independently derived change counts, and safety outcome. They deliberately omit the unified source diff; later review-snapshot persistence owns the canonical human-review artifact.

## References

- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI GPT-5.4 mini model](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
