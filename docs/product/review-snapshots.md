# Review Snapshots

## Responsibility

Capture the immutable [review snapshot](../DICTIONARY.md#review-snapshot) that moves one accepted, verified proposal into human approval and provides the exact evidence binding used by later decisions.

## Not responsible for

- storing the ordered [run timeline](../DICTIONARY.md#run-timeline)
- storing or deciding the human [approval decision](../DICTIONARY.md#approval-decision)
- rendering the [review screen](../DICTIONARY.md#review-screen)
- changing a proposal after it has entered review

## Inputs

- run identity, repository, issue number, and immutable base revision
- final ready proposal with versioned plan and exact unified diff
- passed bounded verification evidence
- accepted critique evidence
- server-owned recording time

## Outputs

- one immutable `awaiting-approval` run view
- detached plan, diff, verification, and critique evidence
- SHA-256 diff and verification-evidence hashes
- the exact base-revision, diff, plan-version, and verification binding consumed by approval
- atomic created, existing, or unresolved-conflict persistence outcome

## Adjacent parts

- proposal attempts supply only their completed final proposal, passed verification, and accepted critique
- the API review query combines the snapshot with timeline history and any approval decision
- GitHub delivery later verifies the approval binding against the approved proposal
- Postgres owns the concrete immutable snapshot row

## Snapshot and persistence rules

A snapshot can be created only for a ready proposal whose verification passed and whose critique accepted the change. Creation copies and deeply freezes JSON evidence so later caller mutation cannot alter the approval gate. The diff hash covers the exact UTF-8 unified diff; the verification hash covers the normalized verifier-owned evidence shape.

The Postgres store records one row per run with explicit binding columns and JSONB plan, verification, and critique evidence. First-writer insertion never updates a row. A uniqueness loss reloads the winner for idempotent comparison by its caller; failure to locate a winner is an explicit conflict. Timeline entries and approval decisions remain in their own canonical stores and are joined only at the API read boundary.

The use case, store, API query composition, and focused tests are implemented. The worker now records the accepted final attempt through an idempotent Activity and exposes only its exact binding in timeline evidence. Live Postgres verification remains open.
