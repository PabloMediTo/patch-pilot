---
id: TASK-m4p8x
title: Generate bounded proposals through structured model output
status: done
priority: critical
type: feature
effort: large
epic: EPIC-czc3e
plan: null
depends_on:
- TASK-z2f7k
blocks: []
related: []
assignee: null
tags:
- planning
- proposal
- openai
- temporal
position: aH
created: 2026-08-16
updated: 2026-08-16
---

# Generate bounded proposals through structured model output

## Description

Compose a worker-owned structured-output provider with the provider-free change-proposal boundary and advance accepted workflow runs from bounded context to a safe proposal outcome.

## Acceptance Criteria

- [x] The executable worker requires an OpenAI credential and uses a pinned configurable model snapshot.
- [x] Plan and diff candidates use separate strict JSON Schema Responses requests with provider storage disabled.
- [x] Provider response size, refusal, malformed output, and HTTP failure are explicit bounded failures.
- [x] Plans contain no more than eight steps or ten unique files, and diffs remain independently parsed and safety assessed.
- [x] Temporal records proposal lifecycle and terminal blocked evidence without publishing source content or the unified diff.
- [x] Architecture, product docs, dictionary, focused tests, full checks, and Markplane remain aligned.

## Notes

- `proposal-generation` is a worker application role because it owns deployment credentials, provider HTTP semantics, prompts, and model policy.
- The only new provider permission is exact `node:buffer`; no SDK dependency or technical exception is introduced.
- Live OpenAI execution remains an environment/credential verification boundary and is not simulated as proof.

## References

- `docs/product/proposal-generation.md`
- `docs/product/change-proposals.md`
- `docs/product/maintenance-workflow.md`
