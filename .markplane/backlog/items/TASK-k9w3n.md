---
id: TASK-k9w3n
title: Execute bounded proposal attempts in an isolated workspace
status: done
priority: critical
type: feature
effort: large
epic: EPIC-czc3e
plan: null
depends_on:
- TASK-m4p8x
blocks: []
related: []
assignee: null
tags:
- proposal
- verification
- critique
- retry
- temporal
position: aI
created: 2026-08-16
updated: 2026-08-16
---

# Execute bounded proposal attempts in an isolated workspace

## Description

Materialize each complete proposal against an immutable disposable checkout and connect apply, verification, critique, and bounded revision to the durable workflow.

## Acceptance Criteria

- [x] Every attempt restores and cleans the exact base before checking and applying the full unified diff.
- [x] Temporary patch files stay inside the generated checkout and are removed after success or failure.
- [x] Verification uses the canonical safe executor and failed verification produces deterministic retry evidence.
- [x] Passing verification invokes a strict structured critique, while revisions advance exactly one plan version and are fully revalidated.
- [x] At most three attempts run, rejected and exhausted outcomes terminate explicitly, and asynchronous cleanup waits for the complete loop.
- [x] Timeline summaries retain bounded verification and critique evidence without publishing unified diffs.
- [x] Architecture, product docs, dictionary, focused tests, full checks, and Markplane remain aligned.

## Notes

- Proposal retries are full replacements against the original base rather than incremental patches.
- `repository-workspaces` gains only exact `node:buffer` access for UTF-8 diff-size enforcement.
- No new module edge, external dependency, or technical exception is introduced.
- Live Docker and OpenAI execution remain explicit runtime verification boundaries.

## References

- `docs/product/proposal-attempts.md`
- `docs/product/repository-workspaces.md`
- `docs/product/maintenance-workflow.md`
