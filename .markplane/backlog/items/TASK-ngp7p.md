---
id: TASK-ngp7p
title: Reconcile GitHub delivery results and webhooks
status: draft
priority: high
type: feature
effort: medium
epic: EPIC-h7exu
plan: null
depends_on:
- TASK-ak2um
blocks:
- TASK-eankx
related: []
assignee: null
tags:
- github
- webhooks
position: a3
created: 2026-08-14
updated: 2026-08-16
---

# Reconcile GitHub delivery results and webhooks

## Description

Deliver **Reconcile GitHub delivery results and webhooks** within the documented product boundaries and MVP safety constraints.

## Acceptance Criteria

- [ ] The observable outcome described by the title is implemented and covered by focused tests.
- [ ] Architecture boundaries, product docs, and persisted run evidence remain aligned.
- [ ] Relevant checks plus `npm run check` and `markplane check` pass.

## Notes

- Added provider-free reconciliation for supported `pull_request` lifecycle actions against immutable delivery evidence.
- Matching identity records normal state/draft/merge observations; installation, repository, URL, head/base branch, or head-revision changes are explicit provider drift and never trigger mutation.
- Unrelated events, unsupported actions, and untracked pull requests are ignored; GitHub redelivery replays through `X-GitHub-Delivery`, while conflicting reuse is rejected.
- Extended the delivery Postgres adapter with parameterized lookup by repository and pull-request number.
- Added atomic Postgres observation persistence with complete immutable evidence, database-level domain constraints, and first-writer recovery for replay/conflict classification.
- Focused tests cover matched open/merged state, changed-head drift, ignored and untracked events, replay, conflict, and malformed provider evidence.
- Store tests cover parameterized writes, immutable row mapping, one-time schema initialization, existing-row recovery, unresolved conflicts, and lifecycle closure.
- Remaining: connect reconciliation to signed control-plane webhook ingestion.

## References
