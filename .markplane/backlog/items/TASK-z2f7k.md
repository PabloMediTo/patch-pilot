---
id: TASK-z2f7k
title: Collect bounded repository planning context
status: done
priority: critical
type: feature
effort: large
epic: EPIC-czc3e
plan: null
depends_on:
- TASK-q8h4v
blocks: []
related: []
assignee: null
tags:
- planning
- repository
- safety
- temporal
position: aG
created: 2026-08-16
updated: 2026-08-16
---

# Collect bounded repository planning context

## Description

Collect deterministic issue-relevant safe repository text after accepted reproduction and expose only bounded selection evidence to the live timeline.

## Acceptance Criteria

- [x] Discovery is deterministic, bounded, and does not follow symbolic links.
- [x] Sensitive, dependency, generated, binary, unsupported, and oversized content is excluded by canonical safety policy.
- [x] Selection contains at most 12 files, 32 KiB each and 128 KiB total from at most 1,000 entries and 200 candidates.
- [x] Accepted reproduction uses a fresh exact-revision context Activity and guaranteed cleanup.
- [x] Full source text stays out of Postgres/Redis timeline payloads.
- [x] Unsupported and malformed context outcomes terminate or fail visibly.
- [x] Focused tests, full checks, architecture, docs, terminology, and Markplane remain aligned.

## Notes

- Instructions and manifests receive stable priority; tests and issue-token matches raise relevance deterministically.
- The complete selected text remains in Temporal Activity evidence for later generator input.
- Added exactly one package-module edge: `repository-understanding` to the public `safety` interface.
- Existing `node:fs/promises` and `node:path` permissions are sufficient; no provider or technical exception was added.
- Concrete plan/diff generator provider selection remains the next workflow milestone.

## References

- `docs/product/repository-planning-context.md`
- `docs/product/maintenance-workflow.md`
- `docs/product/mvp-safety-policy.md`
