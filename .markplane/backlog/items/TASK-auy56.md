---
id: TASK-auy56
title: Bootstrap API, worker, web, and maintenance package
status: done
priority: high
type: feature
effort: large
epic: EPIC-c3x4y
plan: null
depends_on:
- TASK-jyx8p
blocks:
- TASK-gn5s8
- TASK-r7q5a
related: []
assignee: null
tags:
- monorepo
- foundation
position: a0
created: 2026-08-14
updated: 2026-08-14
---

# Bootstrap API, worker, web, and maintenance package

## Description

Deliver **Bootstrap API, worker, web, and maintenance package** within the documented product boundaries and MVP safety constraints.

## Acceptance Criteria

- [x] The observable outcome described by the title is implemented and covered by focused tests.
- [x] Architecture boundaries, product docs, and persisted run evidence remain aligned.
- [x] Relevant checks plus `npm run check` and `markplane check` pass.

## Notes

- Bootstrapped executable composition roots and public interfaces for the API, worker, and web application shells.
- Added the maintenance package's first conceptual module with an immutable initial run state.
- Registered only local composition edges; cross-workspace and provider permissions remain denied.
- Verification: ESLint, 27 Node tests, npm audit, workspace smoke starts, and Markplane integrity checks pass.

## References
