# GitHub Delivery

## Responsibility

Publish one exactly approved [pull-request proposal](../DICTIONARY.md#pull-request-proposal) as a deterministic branch and a linked draft pull request, with safe replay after retries or partial failure.

## Not responsible for

- deciding whether a proposal is approved
- changing or re-verifying proposal content
- merging the pull request
- owning GitHub credentials or durable workflow scheduling

## Inputs

- run, GitHub App installation, repository, issue, and default-branch identity
- canonical source diff, immutable base revision, plan version, and verification identity
- persisted [approval decision](../DICTIONARY.md#approval-decision)
- idempotent branch, draft-pull-request, and delivery-persistence ports

## Outputs

- created or replayed delivery evidence with branch, immutable head revision, and draft-pull-request identity
- a blocked result before side effects when approval is absent or does not match the proposal
- a conflict when durable evidence already belongs to different delivery intent

## Adjacent parts

- [GitHub run ingestion](github-ingestion.md) retains the installation, repository, default branch, issue, and immutable base revision
- the [maintenance workflow](maintenance-workflow.md) invokes delivery only after approval
- Postgres implements the atomic delivery-record port
- a concrete GitHub App adapter will implement branch publication and draft-pull-request creation

## Evidence gate

The delivery use case recomputes the SHA-256 hash of the exact unified source diff. It compares the resulting base revision, diff hash, plan version, passed verification status, and verification-evidence hash with the persisted approval binding. Rejected approvals, legacy unbound approvals, failed verification, and any later proposal mutation stop before a branch or pull request call.

## Deterministic publication

The branch name is `patch-pilot/` followed by the first 24 hexadecimal characters of the run identity's SHA-256 hash. This produces a valid, opaque, stable Git reference without relying on unsafe characters in an external run identifier.

The branch port receives the immutable base revision, exact diff, and diff hash. The pull-request port always receives `draft: true`, the retained default branch as its base, the deterministic branch as its head, and a `Fixes #<issue>` link. A provider response that is not an identified GitHub draft pull request is rejected and not persisted.

## Retry semantics

Delivery first checks durable evidence. A record matching the complete intent replays without provider calls; a different record conflicts. When no record exists, both provider ports must be idempotent: a retry after branch or pull-request creation can safely ensure the same resources again. The final delivery write uses an atomic created-or-existing contract, so a concurrent writer with the same intent becomes a replay while a different writer becomes a conflict.

The concrete Postgres store creates its schema idempotently and records the complete delivery, approval binding, immutable head, and draft-pull-request identity in one row per run. Database checks reinforce positive identifiers and plan versions, full revision and evidence-hash lengths, passed verification, and `draft: true`. Repository/branch and repository/pull-request uniqueness protect deterministic provider identities. An insert conflict reloads the run record for a matching replay; a conflicting provider identity belonging to another run remains an explicit conflict.

The provider-free use case, Postgres store, and focused tests are implemented. Live Postgres verification and the concrete GitHub App adapter remain planned.
