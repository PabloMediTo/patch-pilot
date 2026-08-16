# Run Persistence

## Responsibility

Persist the initial immutable identity and target evidence of one submitted [maintenance run](../DICTIONARY.md#maintenance-run) before durable workflow dispatch.

## Not responsible for

- advancing workflow state or scheduling Temporal
- storing timeline events, plans, tool calls, or review evidence
- resolving a branch name to a commit
- accepting mutable or abbreviated repository target evidence

## Inputs

- a unique run ID
- optional positive GitHub installation and actor IDs
- an `owner/repository` name and positive issue number
- a non-empty issue title of at most 500 characters
- non-empty descriptive issue context of at most 8,000 characters
- an exact non-empty expected-failure fragment of at most 500 characters
- an optional non-empty default branch
- a full lowercase 40-character base commit SHA
- an optional unique source webhook delivery ID
- the exact initial `submitted` status

## Outputs

- one canonical Postgres row with a database-owned submission timestamp
- a created outcome for the first writer
- the existing canonical row after a run-ID or delivery-ID redelivery conflict
- an explicit unresolved conflict when no winning row can be reloaded
- immutable mapped run evidence for later workflow submission and queries

## Adjacent parts

- [GitHub run ingestion](github-ingestion.md) constructs the validated [run submission](../DICTIONARY.md#run-submission)
- [workflow submission](workflow-submission.md) starts Temporal only after durable submission persistence
- the [run timeline](../DICTIONARY.md#run-timeline) owns ordered lifecycle events separately
- the [control-plane runtime](control-plane-runtime.md) connects this store to authenticated issue webhook dispatch

## First-writer rules

The store lazily installs one `maintenance_runs` table. Both run ID and source delivery ID are unique so GitHub redelivery cannot create a second run under another identity. Insertion uses a parameterized `ON CONFLICT DO NOTHING` statement and returns the database winner. If another writer wins, the adapter reloads by run ID or delivery ID. Exactly one matching row is an idempotent existing result; zero rows or two different identity matches are an explicit conflict rather than a guessed winner.

The table stores current run status without constraining the column to `submitted`, leaving later workflow transitions possible. This adapter nevertheless accepts only the initial `submitted` state. New writes require the bounded issue title, descriptive context, and exact expected-failure fragment used by planning and reproduction. Schema evolution keeps these added columns nullable so pre-existing rows remain readable; such legacy rows cannot enter the current workflow and must be resubmitted with explicit evidence. The API passes the database-owned canonical row, including its submission timestamp, to Temporal. Timeline, workflow-step, and review evidence remain in their owning stores instead of accumulating in the run row.
