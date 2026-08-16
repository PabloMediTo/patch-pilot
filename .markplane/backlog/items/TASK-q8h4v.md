---
id: TASK-q8h4v
title: Persist bounded issue evidence for planning
status: done
priority: critical
type: feature
effort: medium
epic: EPIC-czc3e
plan: null
depends_on:
- TASK-p6n2c
blocks:
- TASK-z2f7k
related: []
assignee: null
tags:
- github
- planning
- postgres
- temporal
position: aF
created: 2026-08-16
updated: 2026-08-16
---

# Persist bounded issue evidence for planning

## Description

Preserve the immutable bounded issue title and descriptive context required by planning from authenticated webhook ingestion through Postgres and Temporal submission.

## Acceptance Criteria

- [x] Opted-in issue titles and descriptive context have explicit product-owned bounds.
- [x] The expected-failure marker is excluded from descriptive planning context.
- [x] Missing or oversized evidence is rejected rather than truncated.
- [x] New submitted runs persist and dispatch exact issue title, context, and expected-failure evidence.
- [x] Legacy nullable rows remain readable but cannot enter the current workflow without resubmission.
- [x] Focused tests, full checks, docs, terminology, and Markplane remain aligned.

## Notes

- Issue titles are limited to 500 characters and descriptive context to 8,000 characters.
- The exact expected-failure fragment remains a separate 500-character reproduction input.
- Postgres schema evolution adds nullable columns for legacy readability while application validation requires all evidence for new runs.
- No module, workspace, provider, or architecture-registry permission changed.
- Repository file context and concrete plan/diff generator providers remain separate next milestones.

## References

- `docs/product/github-ingestion.md`
- `docs/product/run-persistence.md`
- `docs/product/change-proposals.md`
