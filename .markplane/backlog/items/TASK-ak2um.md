---
id: TASK-ak2um
title: Publish approved branch and draft pull request idempotently
status: draft
priority: critical
type: feature
effort: large
epic: EPIC-h7exu
plan: null
depends_on:
- TASK-ha9e4
blocks:
- TASK-ngp7p
related: []
assignee: null
tags:
- github
- delivery
position: a7
created: 2026-08-14
updated: 2026-08-15
---

# Publish approved branch and draft pull request idempotently

## Description

Deliver **Publish approved branch and draft pull request idempotently** within the documented product boundaries and MVP safety constraints.

## Acceptance Criteria

- [ ] The observable outcome described by the title is implemented and covered by focused tests.
- [ ] Architecture boundaries, product docs, and persisted run evidence remain aligned.
- [ ] Relevant checks plus `npm run check` and `markplane check` pass.

## Notes

- Approval decisions now persist an exact canonical review binding: base revision, diff hash, plan version, passed verification status, and verification-evidence hash.
- GitHub delivery must compare its proposal against that binding and reject legacy unbound decisions before creating any branch or pull request.

## References
