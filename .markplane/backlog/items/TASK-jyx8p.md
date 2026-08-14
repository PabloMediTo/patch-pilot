---
id: TASK-jyx8p
title: Define target workspaces and architecture registry
status: done
priority: critical
type: chore
effort: small
epic: EPIC-c3x4y
plan: null
depends_on: []
blocks:
- TASK-auy56
- TASK-d5qnh
- TASK-vr2yv
related: []
assignee: null
tags:
- architecture
- foundation
position: a0
created: 2026-08-14
updated: 2026-08-14
---

# Define target workspaces and architecture registry

## Description

Deliver **Define target workspaces and architecture registry** within the documented product boundaries and MVP safety constraints.

## Acceptance Criteria

- [x] The observable outcome described by the title is implemented and covered by focused tests.
- [x] Architecture boundaries, product docs, and persisted run evidence remain aligned.
- [x] Relevant checks plus `npm run check` and `markplane check` pass.

## Notes

- Registered deployable shells: `maintainer-api`, `maintainer-worker`, and `maintainer-web`.
- Registered conceptual package: `maintenance`.
- All modules, composition files, and dependency permissions remain empty until source imports exist.
- Verification: 23 Node tests, ESLint, npm audit, and Markplane integrity checks pass.

## References
