---
id: TASK-i2xge
title: Generate bounded implementation plan and source diff
status: done
priority: critical
type: feature
effort: large
epic: EPIC-czc3e
plan: null
depends_on:
- TASK-8b8wq
blocks:
- TASK-mum6h
related: []
assignee: null
tags:
- agent
- change
position: a4
created: 2026-08-14
updated: 2026-08-14
---

# Generate bounded implementation plan and source diff

## Description

Deliver **Generate bounded implementation plan and source diff** within the documented product boundaries and MVP safety constraints.

## Acceptance Criteria

- [x] The observable outcome described by the title is implemented and covered by focused tests.
- [x] Architecture boundaries, product docs, and persisted run evidence remain aligned.
- [x] Relevant checks plus `npm run check` and `markplane check` pass.

## Notes

- Added a `change-proposals` conceptual module with structured plan and unified-diff generator ports.
- Planning requires a reproduced failure and is limited to eight ordered steps with descriptions, rationales, and explicit file ownership.
- Changed paths and added/deleted line counts are derived from git-style unified diff text rather than trusted generator metrics.
- A proposal is rejected when planned and changed file sets differ; canonical MVP change policy produces the final ready or blocked outcome.
- Persistence, verification, critique, and generator-provider adapters remain owned by their later tasks.

## References
