---
id: TASK-r7q5a
title: Persist run timeline and stream live progress
status: draft
priority: high
type: feature
effort: large
epic: EPIC-ja5tt
plan: null
depends_on:
- TASK-auy56
- TASK-d5qnh
blocks:
- TASK-ha9e4
related: []
assignee: null
tags:
- timeline
- postgres
- redis
position: a2
created: 2026-08-14
updated: 2026-08-14
---

# Persist run timeline and stream live progress

## Description

Deliver **Persist run timeline and stream live progress** within the documented product boundaries and MVP safety constraints.

## Acceptance Criteria

- [ ] The observable outcome described by the title is implemented and covered by focused tests.
- [ ] Architecture boundaries, product docs, and persisted run evidence remain aligned.
- [ ] Relevant checks plus `npm run check` and `markplane check` pass.

## Notes

- Added a `run-timelines` conceptual module with concrete `pg` and `redis` provider adapters.
- Postgres lazily installs an idempotent timeline schema and atomically allocates a unique increasing sequence per run in the same statement that inserts the event.
- Timeline queries return canonical events ordered by their run-local sequence.
- Redis uses one namespaced Pub/Sub channel per run and publishes only after Postgres returns the stored canonical event.
- A Redis publication failure returns a visible partial-failure outcome without rolling back or hiding the Postgres event.
- Provider imports are lazy so pure unit tests do not open network-driver handles.
- Added focused tests for persistence-before-stream ordering, Redis failure, SQL ordering/allocation, channel isolation, and nested JSON immutability.
- Added the API `run-timeline-feed` role, which subscribes before querying history, buffers concurrent live events, emits history first, then deduplicates by run-local sequence.
- Feed closure and history-query failure both unsubscribe the run-scoped Redis channel.
- Added a framework-independent SSE session with canonical event frames, 15-second heartbeats, resume-after-sequence behavior, and idempotent disconnect cleanup including disconnects during catch-up.
- Remaining before completion: run an integration check against the local Postgres and Redis services. Docker is not installed on the current machine, so the task remains `draft` and continues to block the review screen.

## References
