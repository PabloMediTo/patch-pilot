---
id: TASK-dymis
title: Create isolated immutable repository workspace
status: done
priority: critical
type: feature
effort: large
epic: EPIC-wvku6
plan: null
depends_on:
- TASK-gn5s8
blocks:
- TASK-8b8wq
related: []
assignee: null
tags:
- sandbox
- repository
position: a2
created: 2026-08-14
updated: 2026-08-14
---

# Create isolated immutable repository workspace

## Description

Deliver **Create isolated immutable repository workspace** within the documented product boundaries and MVP safety constraints.

## Acceptance Criteria

- [x] The observable outcome described by the title is implemented and covered by focused tests.
- [x] Architecture boundaries, product docs, and persisted run evidence remain aligned.
- [x] Relevant checks plus `npm run check` and `markplane check` pass.

## Notes

- Added unique disposable repository directories under a caller-owned root.
- Added bounded, shell-free, non-interactive Git fetch and Detached-HEAD checkout for one full immutable commit ID.
- Added exact HEAD verification and removal of the origin remote after checkout.
- Rejected repository URLs with embedded credentials before any Git command is executed.
- Added failure cleanup and a removal guard that rejects arbitrary or out-of-root targets.
- Kept container, network, and target-command resource isolation for the dedicated MVP safety task.
- Verification: real local Git integration test, destructive-target rejection, ESLint, architecture checks, npm audit, and Markplane integrity checks pass.

## References
