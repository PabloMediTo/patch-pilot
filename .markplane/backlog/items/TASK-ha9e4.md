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
- Added a provider-free approval use case that accepts only the first decision for an awaiting run, requires rejection reasons, replays matching idempotency keys, and rejects competing decisions.
- Kept atomic first-writer persistence behind an injected port and covered created, replayed, conflicting, invalid, and non-reviewable outcomes.
- Added a concrete Postgres approval store with idempotent schema initialization, parameterized queries, one-decision-per-run and unique-idempotency constraints, and conflict recovery.
- Unit tests verify SQL atomicity, parameter order, row mapping, reads, and one-time schema setup; live Postgres proof remains blocked by unavailable Docker.
- Added an authenticated framework-independent API handler for `POST /runs/:runId/approval/approve|reject` with required idempotency keys and actor binding.
- Mapped created, replayed, unauthorized, invalid, method, and conflict outcomes to stable HTTP responses with focused tests.
- Registered `run-approval-http` with only the maintenance workspace edge and exact `node:url` provider.
- Added an authenticated `GET /runs/:runId/review` handler with run-level access checks, injected evidence loading, and stable method, authorization, and missing-review outcomes.
- Served escaped HTML with a restrictive no-script, same-origin-form content security policy and `nosniff` protection.
- Registered `run-review-http` with only the `run-review` module edge and exact `node:url` provider.
- Remaining before completion: concrete server/session wiring, live SSE updates, and browser-level visual verification.

## References
