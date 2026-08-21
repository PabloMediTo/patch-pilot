---
id: TASK-eankx
title: Run end-to-end pilot on Python and TypeScript repositories
status: draft
priority: high
type: chore
effort: large
epic: EPIC-pqrpi
plan: null
depends_on:
- TASK-ngp7p
- TASK-vr2yv
blocks: []
related: []
assignee: null
tags:
- e2e
- pilot
position: a4
created: 2026-08-14
updated: 2026-08-21
---

# Run end-to-end pilot on Python and TypeScript repositories

## Description

Deliver **Run end-to-end pilot on Python and TypeScript repositories** within the documented product boundaries and MVP safety constraints.

## Acceptance Criteria

- [ ] The observable outcome described by the title is implemented and covered by focused tests.
- [ ] Architecture boundaries, product docs, and persisted run evidence remain aligned.
- [ ] Relevant checks plus `npm run check` and `markplane check` pass.

## Notes

- The controlled workflow path now reaches an idempotent draft-pull-request delivery after exact human approval.
- Rejection terminates without a GitHub provider call; delivery conflicts and blocked evidence remain explicit outcomes.
- The remaining pilot requires live Temporal, Postgres, Redis, OpenAI, GitHub App, and container-runtime access for representative Python and TypeScript repositories.

## References
