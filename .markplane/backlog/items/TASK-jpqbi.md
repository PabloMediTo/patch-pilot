---
id: TASK-jpqbi
title: Persist submitted maintenance runs idempotently
status: done
priority: critical
type: feature
effort: medium
epic: EPIC-c3x4y
plan: null
depends_on: []
blocks: []
related: []
assignee: null
tags:
- runs
- postgres
- temporal
position: a9
created: 2026-08-16
updated: 2026-08-16
---

# Persist submitted maintenance runs idempotently

## Description

Record each authenticated submitted maintenance run durably before Temporal dispatch, preserving immutable repository evidence and treating GitHub webhook redelivery as an idempotent first-writer operation.

## Acceptance Criteria

- [x] Initial run identity and immutable target evidence are validated before persistence.
- [x] Postgres atomically creates or reloads one canonical run across run-ID and source-delivery conflicts.
- [x] Architecture, product docs, focused tests, full checks, and Markplane remain aligned.

## Notes

- Added full repository, positive numeric identity, default-branch, and 40-character commit validation to initial run creation.
- Added a lazy idempotent `maintenance_runs` schema with unique run and source-delivery identities and database-owned submission time.
- Added parameterized first-writer insertion, unambiguous conflict reload, immutable row mapping, explicit unresolved or split-identity conflicts, and independently closeable lifecycle.
- Kept timeline, workflow-step, proposal, and review evidence in their existing owners rather than expanding the run row.
- Registered only the exact `pg` provider permission for the existing conceptual `runs` module; no new module, edge, or architecture exception was added.
- Focused tests cover domain rejection, created persistence, redelivery recovery, ordered parameters, schema reuse, reads, non-submitted rejection, and unresolved conflict.
- Completed as the durable prerequisite for wiring authenticated issue webhook envelopes to Temporal.

## References
