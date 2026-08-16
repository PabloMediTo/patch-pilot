---
id: TASK-t4mp0
title: Dispatch persisted issue runs to Temporal
status: done
priority: critical
type: feature
effort: medium
epic: EPIC-wvku6
plan: null
depends_on:
- TASK-7zdwa
blocks:
- TASK-k3w9q
related: []
assignee: null
tags:
- temporal
- runs
- api
position: aB
created: 2026-08-16
updated: 2026-08-16
---

# Dispatch persisted issue runs to Temporal

## Description

Submit each canonical persisted issue run to Temporal with deterministic identity and retry-safe webhook behavior.

## Acceptance Criteria

- [x] Created and replayed persisted runs start or recover one deterministic Temporal workflow.
- [x] Persistence conflicts never dispatch, while provider failures remain visible for webhook retry.
- [x] The executable deployment owns one reusable Temporal client lifecycle and explicit environment contract.
- [x] Architecture boundaries, product docs, focused tests, full checks, and Markplane remain aligned.

## Notes

- Added the `workflow-submission` API role as the sole owner of `@temporalio/client`.
- Reused the canonical run ID as the workflow ID and passed the complete persisted submitted run to `maintenanceRunWorkflow` on the configured task queue.
- Normalized only `WorkflowExecutionAlreadyStartedError` as an idempotent existing outcome; other provider errors remain visible so GitHub can redeliver after persistence.
- Connected created and replayed issue submissions after Postgres persistence while leaving conflicts and unrelated events undispatched.
- Added deployment defaults and overrides for Temporal address, namespace, and task queue plus deterministic connection cleanup.
- Added only the exact `application` to `workflow-submission` module edge and the module-local `@temporalio/client` provider permission.
- Worker-side workflow and Activity implementation is the next orchestration milestone.

## References
