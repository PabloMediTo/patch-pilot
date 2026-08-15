---
id: TASK-ak2um
title: Publish approved branch and draft pull request idempotently
status: draft
priority: critical
type: feature
effort: large
epic: EPIC-h7exu
plan: null
depends_on:
- TASK-ha9e4
blocks:
- TASK-ngp7p
related: []
assignee: null
tags:
- github
- delivery
position: a7
created: 2026-08-14
updated: 2026-08-15
---

# Publish approved branch and draft pull request idempotently

## Description

Deliver **Publish approved branch and draft pull request idempotently** within the documented product boundaries and MVP safety constraints.

## Acceptance Criteria

- [ ] The observable outcome described by the title is implemented and covered by focused tests.
- [ ] Architecture boundaries, product docs, and persisted run evidence remain aligned.
- [ ] Relevant checks plus `npm run check` and `markplane check` pass.

## Notes

- Approval decisions now persist an exact canonical review binding: base revision, diff hash, plan version, passed verification status, and verification-evidence hash.
- GitHub delivery must compare its proposal against that binding and reject legacy unbound decisions before creating any branch or pull request.
- Added a provider-free delivery use case that recomputes the diff hash, enforces the complete approval binding, and blocks rejected, legacy, failed, or mutated evidence before side effects.
- Derived a safe deterministic `patch-pilot/<hash>` branch from the run identity and retained the submitted repository default branch as the reviewed pull-request base.
- Required idempotent branch and draft-pull-request ports, forced issue linking and `draft: true`, and normalized matching durable and concurrent retries.
- Registered `deliveries` as a conceptual maintenance module with only the exact `node:crypto` provider; focused tests cover creation, replay, conflict, approval rejection, evidence mutation, and unsafe provider output.
- Added an atomic Postgres delivery store with one complete evidence row per run, parameterized writes, idempotent schema initialization, provider-identity uniqueness, and database checks for immutable revisions, hashes, passed verification, and draft-only pull requests.
- Store tests cover created records, reads, same-run recovery, cross-run unique conflicts, row mapping, stable parameter order, and one-time schema setup.
- Extended the `deliveries` architecture permission with the exact `pg` provider; no cross-module edge or technical exception was added.
- Remaining: implement the concrete GitHub App adapter and run live Postgres/GitHub integration proof before completing this task.

## References
