---
id: TASK-vr2yv
title: Enforce MVP execution and change safety limits
status: draft
priority: critical
type: feature
effort: large
epic: EPIC-pqrpi
plan: null
depends_on:
- TASK-jyx8p
blocks:
- TASK-eankx
related: []
assignee: null
tags:
- safety
- policy
position: a8
created: 2026-08-14
updated: 2026-08-14
---

# Enforce MVP execution and change safety limits

## Description

Deliver **Enforce MVP execution and change safety limits** within the documented product boundaries and MVP safety constraints.

## Acceptance Criteria

- [ ] The observable outcome described by the title is implemented and covered by focused tests.
- [ ] Architecture boundaries, product docs, and persisted run evidence remain aligned.
- [ ] Relevant checks plus `npm run check` and `markplane check` pass.

## Notes

- Implemented the canonical immutable MVP execution and change policy.
- Allowed only exact `npm test` and `python -m pytest` commands inside the declared repository workspace.
- Added mandatory CPU, memory, disk, timeout, output, network, and filesystem sandbox specifications that callers cannot weaken.
- Blocked oversized diffs, traversal, secrets, keys, dependency manifests, requirements, lockfiles, migrations, generated files, and distribution artifacts.
- Verified that blocked requests never invoke the sandbox port.
- Remaining before completion: implement and exercise a concrete container adapter that proves every runtime limit is applied. Docker is not installed on the current machine.

## References
