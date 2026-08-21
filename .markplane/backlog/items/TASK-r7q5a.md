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
related:
- TASK-k3w9q
assignee: null
tags:
- timeline
- postgres
- redis
position: a2
created: 2026-08-14
updated: 2026-08-21
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
- Adapter-owned Postgres pools now enforce a five-second connection timeout and ten-second client-query and server-statement timeouts, with focused configuration and lifecycle coverage; injected pools retain caller ownership.
- Timeline queries return canonical events ordered by their run-local sequence.
- Redis uses one namespaced Pub/Sub channel per run and publishes only after Postgres returns the stored canonical event.
- Publisher and subscriber clients now install provider error listeners before connection so Redis events cannot terminate the process independently; connect, publish, and subscribe promises still reject as the visible failure channel, with focused coverage.
- Redis connections now use a five-second socket timeout and at most five capped reconnect delays; an unavailable service rejects through the controlled promise path instead of keeping the runtime or live integration command open indefinitely.
- Redis subscriptions now discard malformed JSON, incomplete event envelopes, invalid ordering fields, and cross-run messages before they reach the feed; Postgres catch-up remains the canonical repair path, with focused rejection coverage.
- Redis stream shutdown now closes only adapter-created clients. Fully injected clients retain caller ownership, while a subscriber duplicated by the adapter is still closed by it; focused tests cover all ownership shapes.
- A Redis publication failure returns a visible partial-failure outcome without rolling back or hiding the Postgres event.
- Provider imports are lazy so pure unit tests do not open network-driver handles.
- Added focused tests for persistence-before-stream ordering, Redis failure, SQL ordering/allocation, channel isolation, and nested JSON immutability.
- Added the API `run-timeline-feed` role, which subscribes before querying history, buffers concurrent live events, emits history first, then deduplicates by run-local sequence.
- Feed closure and history-query failure both unsubscribe the run-scoped Redis channel.
- Added a framework-independent SSE session with canonical event frames, 15-second heartbeats, resume-after-sequence behavior, and idempotent disconnect cleanup including disconnects during catch-up.
- Added `npm run test:timeline-integration`, which uses the real provider clients, requires two Redis deliveries, and compares them with ordered Postgres history. It intentionally fails rather than skipping when services are absent.
- Added the separate `run-timeline-http` API role for authenticated `GET /runs/:runId/timeline`, strict `Last-Event-ID` parsing, terminal JSON errors, and Node-compatible disconnect cleanup.
- Composed the timeline route into the concrete Node API dispatcher and server without buffering, with transport-owned repeating heartbeat scheduling.
- Made deterministic event IDs replay the canonical first Postgres evidence while rejecting identity reuse with different evidence, allowing Temporal Activity retries to remain idempotent.
- Connected the first worker workflow phase to submitted and inspection lifecycle events; Redis may republish an exact replay, while API and browser consumers deduplicate its canonical sequence.
- Extracted a provider-free integration evidence verifier that requires both writes to persist and stream, exact canonical Postgres and Redis ordering and payloads, and matching unique provider event IDs.
- Added focused verifier tests for the passing report, partial streaming failure, Postgres ordering drift, missing Redis delivery, and provider identity mismatch. The live runner now emits only sanitized successful check names.
- Remaining before completion: run an integration check against the local Postgres and Redis services. Docker is not installed on the current machine, so the task remains `draft` and continues to block the review screen.

## References
