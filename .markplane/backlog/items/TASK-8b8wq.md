---
id: TASK-8b8wq
title: Detect supported project and reproduce issue failure
status: done
priority: critical
type: feature
effort: large
epic: EPIC-wvku6
plan: null
depends_on:
- TASK-dymis
blocks:
- TASK-i2xge
related: []
assignee: null
tags:
- reproduction
- python
- typescript
position: a3
created: 2026-08-14
updated: 2026-08-14
---

# Detect supported project and reproduce issue failure

## Description

Deliver **Detect supported project and reproduce issue failure** within the documented product boundaries and MVP safety constraints.

## Acceptance Criteria

- [x] The observable outcome described by the title is implemented and covered by focused tests.
- [x] Architecture boundaries, product docs, and persisted run evidence remain aligned.
- [x] Relevant checks plus `npm run check` and `markplane check` pass.

## Notes

- Added deterministic TypeScript/npm and Python/pytest root detection with explicit unsupported and ambiguous outcomes.
- Added standard reproduction command descriptors without parsing arbitrary issue commands.
- Added structured reproduction evidence and distinct reproduced, not-reproduced, different-failure, and execution-failure outcomes.
- Required both a non-zero exit and an exact expected failure fragment before accepting a reproduction.
- Rejected timed-out or output-truncated execution evidence as incomplete.
- Kept untrusted process execution behind the bounded executor port until the dedicated safety task provides the concrete sandbox.
- Verification: detection fixtures, reproduction outcome tests, ESLint, architecture checks, npm audit, and Markplane integrity checks pass.

## References
