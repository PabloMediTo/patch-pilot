---
id: TASK-gn5s8
title: Create GitHub App ingestion and run submission
status: done
priority: critical
type: feature
effort: large
epic: EPIC-wvku6
plan: null
depends_on:
- TASK-auy56
- TASK-d5qnh
blocks:
- TASK-dymis
related: []
assignee: null
tags:
- github
- runs
position: a1
created: 2026-08-14
updated: 2026-08-14
---

# Create GitHub App ingestion and run submission

## Description

Deliver **Create GitHub App ingestion and run submission** within the documented product boundaries and MVP safety constraints.

## Acceptance Criteria

- [x] The observable outcome described by the title is implemented and covered by focused tests.
- [x] Architecture boundaries, product docs, and persisted run evidence remain aligned.
- [x] Relevant checks plus `npm run check` and `markplane check` pass.

## Notes

- Added constant-time HMAC-SHA256 verification for the unmodified GitHub delivery body.
- Added explicit `issues`/`labeled`/`patch-pilot` opt-in and validated payload extraction.
- Added injected immutable-revision resolution and run submission ports without coupling the API shell to concrete GitHub, database, or Temporal adapters.
- Retained delivery, installation, actor, repository, issue, and revision context in the initial run state.
- Verification: ESLint, focused accepted/rejected/ignored ingestion tests, architecture checks, npm audit, and Markplane integrity checks pass.

## References
