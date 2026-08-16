---
id: TASK-k3w9q
title: Run the first Temporal inspection workflow phase
status: done
priority: critical
type: feature
effort: large
epic: EPIC-wvku6
plan: null
depends_on:
- TASK-t4mp0
blocks:
- TASK-r3pr0
related:
- TASK-r7q5a
assignee: null
tags:
- temporal
- worker
- inspection
- timeline
position: aC
created: 2026-08-16
updated: 2026-08-16
---

# Run the first Temporal inspection workflow phase

## Description

Register the real maintenance workflow in the executable worker and orchestrate replay-safe submitted and repository-inspection Activities.

## Acceptance Criteria

- [x] The Worker bundles and registers `maintenanceRunWorkflow` on the same configurable task queue used by API submission.
- [x] Workflow orchestration records deterministic timeline commands and executes inspection through bounded Activity retry policies.
- [x] Inspection checks out the exact revision, detects one supported project shape, removes the checkout, and excludes local paths from durable evidence.
- [x] Worker Temporal, Postgres, Redis, and polling resources close deterministically.
- [x] Architecture boundaries, product docs, focused tests, full checks, and Markplane remain aligned.

## Notes

- Added the worker `maintenance-workflow` application role as the sole owner of deterministic orchestration and `@temporalio/workflow`.
- Added an executable worker deployment whose `application` role alone owns `@temporalio/worker`, native connection creation, workflow bundling, provider composition, and shutdown.
- Applied separate bounded retry and timeout policies to timeline and inspection Activities.
- Added deterministic event identities for submitted, inspection-started, inspection-completed, and inspection-failed evidence.
- Made Postgres timeline append replay-safe for exact event evidence while rejecting conflicting reuse; Redis duplicates remain harmless because consumers deduplicate canonical sequences.
- Inspection uses a fresh exact-revision checkout, returns only language and standard command evidence, and always removes the local workspace.
- Credential-free GitHub HTTPS checkout is the current executable boundary; non-interactive GitHub App credentials remain future work.
- Workflow bundling and all provider boundaries are covered without claiming unavailable live Temporal, Postgres, Redis, or Docker verification.

## References
