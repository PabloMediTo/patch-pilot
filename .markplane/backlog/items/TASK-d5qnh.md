---
id: TASK-d5qnh
title: Provide local Temporal, Postgres, and Redis environment
status: done
priority: high
type: chore
effort: medium
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
- infrastructure
- local-dev
position: a1
created: 2026-08-14
updated: 2026-08-14
---

# Provide local Temporal, Postgres, and Redis environment

## Description

Deliver **Provide local Temporal, Postgres, and Redis environment** within the documented product boundaries and MVP safety constraints.

## Acceptance Criteria

- [x] The observable outcome described by the title is implemented and covered by focused tests.
- [x] Architecture boundaries, product docs, and persisted run evidence remain aligned.
- [x] Relevant checks plus `npm run check` and `markplane check` pass.

## Notes

- Added pinned Postgres, Redis, Temporal, and Temporal UI services in `compose.yaml`.
- Added readiness ordering and health checks for every required backend service.
- Added npm lifecycle commands and local-development documentation.
- Verification: YAML parsing, focused Compose contract tests, ESLint, Node tests, npm audit, and Markplane integrity checks pass.
- Docker is not installed on the current machine, so the runtime health wait must be exercised when Docker Desktop becomes available.

## References
