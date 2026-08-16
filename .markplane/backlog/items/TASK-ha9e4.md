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
updated: 2026-08-15
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
- Added a CSP-compatible same-origin browser asset that connects to `/runs/:runId/timeline`, consumes named `timeline` SSE events, and deduplicates run-local sequences.
- Streamed repository or agent content enters the document only via `textContent`; tests reject `innerHTML` use and verify the exact named-event contract.
- Registered provider-free `run-review-live` independently from server rendering and persistence.
- Added a same-origin web HTTP dispatcher that serves review pages and the browser asset locally, forwards only timeline and approval route shapes through an injected API transport, and returns 404 for unknown routes.
- Registered `web-http` with only the `run-review-http`, `run-review-live`, and exact `node:url` edges; focused tests cover local dispatch, API forwarding, and fallback behavior.
- Added a concrete Node HTTP server with streaming HTTP/HTTPS API forwarding, upstream status/header preservation, browser-disconnect cleanup, and injected authorization/evidence ports.
- A real loopback integration test proves that review pages stay local while approval method, path, body, status, and response pass through the web origin unchanged.
- Registered `web-server` with only the `web-http` edge and exact `node:http`, `node:https`, and `node:url` providers.
- Added a provider-free same-origin stylesheet with semantic diff colors, responsive evidence cards, accessible focus states, and mobile layout; CSP remains restrictive and permits styles only from self.
- Browser verification covers a two-column 1280-pixel desktop layout, single-column 375-pixel mobile layout, no page-level horizontal overflow, visible approval controls, and insertion of the live sequence-4 timeline event.
- Registered `run-review-style` independently from rendering and live-event behavior; the dispatcher alone composes the three review routes.
- Added the API-owned authenticated `GET /runs/:runId/review-evidence` handler with stable method, unauthorized, missing, and no-store success responses.
- Added a bounded server-side web client that forwards only cookie or bearer credentials, maps access outcomes, rejects unsupported API origins and malformed evidence, and keeps session policy out of the web deployment.
- Refactored review delivery to consume the combined API access result, removing separate web authorization and evidence ports.
- The environment-configured web `main.js` now validates its TCP port and starts the concrete server; a direct process smoke check proved its 404 fallback on the configured listener.
- Registered the API `run-review-evidence-http` and web `run-review-api` roles with only their exact module and Node provider edges.
- Added the concrete API Node listener and dispatcher for review evidence, approval commands, and timeline SSE with bounded body parsing, heartbeat scheduling, stable fallback, and safe error mapping.
- Browser approval forms now submit Same-Origin JSON with generated idempotency keys and reload canonical evidence only after a successful decision.
- Registered `api-http` with only the three route-role edges and `api-server` with only `api-http` plus exact Node buffer, HTTP, timer, and URL providers.
- Bound every new approval decision to canonical base-revision, diff, plan-version, passed-verification, and verification-evidence hashes loaded from run state rather than browser input.
- Evolved the Postgres approval schema idempotently so evidence bindings survive retries; legacy unbound decisions remain readable but deliberately cannot authorize GitHub delivery.
- Added an environment-configured single-operator bearer authentication adapter with a stable audit actor, shared approval/run-access ports, fixed-length digest comparison, and strict secret/identity validation.
- Registered `api-authentication` as an independent security application role with only the exact `node:crypto` provider permission; focused tests cover valid, malformed, missing, array-valued, and incorrect credentials plus configuration rejection.
- Added an API application-runtime composition that constructs deployment authentication and supplies it to the concrete server while keeping persisted data ports explicit.
- The concrete server now derives approval authentication and both review/timeline run-access checks from that one shared source; focused loopback tests prove valid bearer access and rejection when the credential is absent.
- Remaining before completion: compose the executable control-plane main process with persisted evidence stores, listener, and lifecycle ownership; live timeline persistence verification remains tracked by `TASK-r7q5a`.

## References
