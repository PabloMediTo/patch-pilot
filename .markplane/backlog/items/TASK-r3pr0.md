---
id: TASK-r3pr0
title: Reproduce issue failures in the Temporal workflow
status: done
priority: critical
type: feature
effort: large
epic: EPIC-wvku6
plan: null
depends_on:
- TASK-k3w9q
blocks:
- TASK-p6n2c
related: []
assignee: null
tags:
- temporal
- worker
- reproduction
- safety
position: aD
created: 2026-08-16
updated: 2026-08-16
---

# Reproduce issue failures in the Temporal workflow

## Description

Carry a bounded explicit expected-failure fragment from authenticated issue ingestion into a fresh isolated reproduction Activity and record its classified evidence.

## Acceptance Criteria

- [x] Opted-in issues require exactly one explicit expected-failure fragment and persist it with the immutable run target.
- [x] Supported projects reproduce in a fresh exact-revision workspace through the canonical safe executor.
- [x] Unsupported projects skip reproduction without invoking a repository command.
- [x] Reproduction lifecycle and classified results are recorded with replay-safe timeline identities.
- [x] Cleanup, ambiguity rejection, architecture boundaries, product docs, focused tests, full checks, and Markplane remain aligned.

## Notes

- The issue marker is explicit and bounded to 500 characters so workflow evidence is never guessed from arbitrary prose.
- Existing run rows remain readable after nullable schema evolution, but legacy rows without the fragment must be resubmitted.
- Inspection and reproduction intentionally use separate checkouts; no Activity-local path enters durable workflow state.
- The reproduction Activity supplies the workspace boundary required by safety policy and always removes its checkout in `finally`.
- Added only the exact worker module edge `maintenance-workflow` to `sandbox-execution`; no provider or technical exception was added.
- Unit and bundle checks cover orchestration. Live Docker limit enforcement remains open because Docker is unavailable locally.

## References

- `docs/product/failure-reproduction.md`
- `docs/product/maintenance-worker-runtime.md`
