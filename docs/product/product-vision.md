# Product Vision

## Problem

Small GitHub bugs still require a maintainer to assemble repository context, reproduce the issue, identify a safe change, execute project-specific checks, review a diff, and prepare a useful pull request. Coding assistants can help with individual steps but often hide transitions, lose state after failures, or present unverified changes.

## Product promise

A user selects a GitHub repository and issue. The Autonomous GitHub Maintainer executes a transparent, durable maintenance run and produces a tested pull-request proposal that a human can approve or reject.

The primary product value is the controlled workflow and its evidence, not autonomous code generation by itself.

## Primary user

The initial user is a repository maintainer who wants help resolving a small, well-scoped bug in a Python or TypeScript repository while retaining control of all published changes.

## Successful outcome

A successful maintenance run provides:

- an immutable repository and issue reference
- a reproducible failing command or test
- an explicit implementation plan
- a bounded source diff
- passing verification evidence
- a critique result and retry history
- a human approval decision
- an approved pull-request proposal linked to the issue

## Non-goals

- autonomous merge or deployment
- broad feature development
- dependency or framework migrations
- support for arbitrary repository languages
- resolving issues that cannot be reproduced
- changing repositories without explicit installation and approval
