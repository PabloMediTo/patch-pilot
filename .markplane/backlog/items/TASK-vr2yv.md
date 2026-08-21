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
updated: 2026-08-21
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
- Added a Docker adapter that selects pinned Node.js or Python runtimes and maps the immutable policy to network, CPU, memory, writable-layer disk, PID, capability, timeout, and output controls.
- The adapter copies the repository into the quota-controlled container layer instead of bind-mounting the host workspace, then forcibly removes the container after success or preparation failure.
- Unit tests cover command construction, runtime selection, working-directory mapping, command order, and cleanup after a failed copy.
- Added a worker-owned Docker CLI process port that invokes exact argument vectors without a shell, enforces timeout and output bounds, and returns standard execution evidence.
- Focused tests cover success evidence, timeout classification, output truncation, and invalid requests.
- Registered the `docker-cli` worker role with only the exact `node:child_process` provider permission.
- Composed immutable policy, Docker sandbox adapter, and bounded CLI execution behind one worker command executor with internally generated container identities.
- Verified that allowed commands traverse create, copy, attach, and cleanup while blocked commands never invoke Docker.
- Registered only the required worker-to-maintenance workspace edge, `sandbox-execution` to `docker-cli` module edge, and `node:crypto` provider permission.
- The Temporal reproduction Activity now consumes the composed executor with the required workspace boundary; unit tests cover this wiring without claiming live runtime enforcement.
- Added `npm run test:sandbox-integration`, which drives a disposable Node fixture through the real worker executor and validates effective cgroup CPU, memory, disk and PID limits, disabled network, dropped capabilities, `no-new-privileges`, workspace copy isolation, bounded evidence, and forced cleanup.
- Extended the runner with short controlled output-overflow and timeout probes through the real bounded Docker CLI port; both require exact evidence classification and forced container cleanup without weakening the canonical production limits.
- The provider-free verifier has focused pass/failure tests, validates the exact test-only process bounds, and emits only fixed check names. It intentionally fails instead of skipping when Docker or a required invariant is unavailable.
- Remaining before completion: retain one successful live result from this command. On the current machine the runner reaches the expected Docker-create failure because Docker is unavailable.

## References
