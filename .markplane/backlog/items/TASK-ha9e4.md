---
id: TASK-ha9e4
title: Build diff, evidence, and approval review screen
status: draft
priority: critical
type: feature
effort: large
epic: EPIC-ja5tt
plan: null
depends_on:
- TASK-mum6h
- TASK-r7q5a
blocks:
- TASK-ak2um
related: []
assignee: null
tags:
- frontend
- approval
position: a6
created: 2026-08-14
updated: 2026-08-14
---

# Build diff, evidence, and approval review screen

## Description

Deliver **Build diff, evidence, and approval review screen** within the documented product boundaries and MVP safety constraints.

## Acceptance Criteria

- [ ] The observable outcome described by the title is implemented and covered by focused tests.
- [ ] Architecture boundaries, product docs, and persisted run evidence remain aligned.
- [ ] Relevant checks plus `npm run check` and `markplane check` pass.

## Notes

- Added a framework-independent immutable review model for run state, ordered timeline events, implementation plan, semantic diff lines, verification evidence, and an existing decision.
- Added escaped server-deliverable HTML so untrusted repository and agent content cannot inject markup.
- Approve and reject forms are exposed only while a run is `awaiting-approval` and has no recorded decision.
- Focused tests cover evidence presentation, diff classification, HTML escaping, first-decision gating, and non-reviewable states.
- Registered `run-review` as a provider-free web application role with an explicit public interface.
- Remaining before completion: authenticated API data loading, live SSE updates, approval submission/persistence, and browser-level visual verification.

## References
