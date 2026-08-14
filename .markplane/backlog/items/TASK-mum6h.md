---
id: TASK-mum6h
title: Execute verification, critique, and bounded retries
status: done
priority: critical
type: feature
effort: large
epic: EPIC-czc3e
plan: null
depends_on:
- TASK-i2xge
blocks:
- TASK-ha9e4
related: []
assignee: null
tags:
- tests
- retry
- critique
position: a5
created: 2026-08-14
updated: 2026-08-14
---

# Execute verification, critique, and bounded retries

## Description

Deliver **Execute verification, critique, and bounded retries** within the documented product boundaries and MVP safety constraints.

## Acceptance Criteria

- [x] The observable outcome described by the title is implemented and covered by focused tests.
- [x] Architecture boundaries, product docs, and persisted run evidence remain aligned.
- [x] Relevant checks plus `npm run check` and `markplane check` pass.

## Notes

- Added separate `verifications`, `critiques`, and `proposal-attempts` conceptual modules.
- Verification records immutable command, exit, output, duration, timeout, and truncation evidence for the supported project's standard command.
- Failed verification requests a modification retry; timeout and truncated output terminate as execution failures without spending a modify retry.
- Passing verification reaches a structured reviewer port; accepted critiques cannot contain blocking findings.
- The attempt loop preserves every proposal, verification, and critique and permits exactly two revisions after the initial attempt.
- Each revision must return a ready proposal with the next plan version.
- Concrete patch application, sandbox execution, provider adapters, persistence, and Temporal Activity retry behavior remain separate later work.

## References
