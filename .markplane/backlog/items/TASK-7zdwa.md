---
id: TASK-7zdwa
title: Connect authenticated issue webhooks to run persistence
status: done
priority: critical
type: feature
effort: medium
epic: EPIC-wvku6
plan: null
depends_on: []
blocks:
- TASK-t4mp0
related: []
assignee: null
tags:
- github
- runs
- postgres
position: aA
created: 2026-08-16
updated: 2026-08-16
---

# Connect authenticated issue webhooks to run persistence

## Description

Route already authenticated GitHub webhook envelopes through repository-scoped base-revision resolution into atomic run persistence while retaining pull-request delivery reconciliation.

## Acceptance Criteria

- [x] Only an opted-in issue event resolves an immutable default-branch revision and constructs a run.
- [x] First writes, exact redeliveries, identity conflicts, unsupported events, and pull-request reconciliation have stable outcomes.
- [x] The executable deployment, architecture, product docs, focused tests, full checks, and Markplane remain aligned.

## Notes

- Moved issue submission behind the HTTP handler's authenticated parsed envelope so HMAC verification has one owner and is not repeated after parsing.
- Added repository-scoped Git-ref resolution through the existing bounded GitHub App request contract and accepted only successful full 40-character commit SHAs.
- Added an ingestion router that sends `pull_request` envelopes to delivery reconciliation and possible `issues` envelopes to explicit opt-in parsing.
- Mapped run-store creation to `accepted`, one canonical existing row to `replayed`, and unresolved or split identity evidence to `conflict`.
- Composed the shared run store and GitHub request into the executable API deployment; the real signed HTTP path now reaches durable persistence.
- Added only the exact `application` to `github-ingestion` module edge; no provider permission, new module, or architecture exception was needed.
- Focused tests cover encoded branch names, provider request shape, full revision enforcement, persistence outcomes, route separation, signed deployment dispatch, and lifecycle closure.
- Completed as the final persistence boundary before first Temporal workflow submission.

## References
