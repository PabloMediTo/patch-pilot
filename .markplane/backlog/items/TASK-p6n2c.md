---
id: TASK-p6n2c
title: Gate planning on accepted reproduction evidence
status: done
priority: critical
type: feature
effort: medium
epic: EPIC-wvku6
plan: null
depends_on:
- TASK-r3pr0
blocks: []
related: []
assignee: null
tags:
- temporal
- workflow
- reproduction
- evidence
position: aE
created: 2026-08-16
updated: 2026-08-16
---

# Gate planning on accepted reproduction evidence

## Description

Allow the durable workflow to become planning-ready only after an accepted reproduced outcome and terminate every other known reproduction result explicitly.

## Acceptance Criteria

- [x] Only `reproduced` records deterministic planning-ready evidence.
- [x] Unsupported, not-reproduced, different-failure, and execution-failed outcomes record explicit terminal evidence.
- [x] Unknown Activity classifications fail visibly and cannot enter planning.
- [x] Focused tests cover accepted, terminal, skipped, failed, and malformed outcomes.
- [x] Product docs, terminology, full checks, and Markplane remain aligned.

## Notes

- The returned workflow status now preserves the exact validated reproduction classification instead of using the ambiguous `reproduction-completed` label.
- `run.planning.ready` is emitted only for accepted reproduction; `run.terminal` owns non-planning outcomes.
- This task introduces no module, workspace, provider, or architecture-registry change.
- Proposal generation remains separate because concrete generator/provider selection is still an open product decision.

## References

- `docs/product/maintenance-workflow.md`
- `docs/product/failure-reproduction.md`
- `docs/product/run-timelines.md`
