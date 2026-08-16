# GitHub Delivery Reconciliation

## Responsibility

Compare an authenticated GitHub `pull_request` webhook with immutable [GitHub delivery](../DICTIONARY.md#github-delivery) evidence and produce one idempotent [GitHub delivery observation](../DICTIONARY.md#github-delivery-observation).

## Not responsible for

- publishing or updating commits, branches, or pull requests
- authenticating the raw webhook body
- deciding whether a human may merge or close a pull request
- replacing the original immutable delivery evidence

## Inputs

- unique `X-GitHub-Delivery` identity, `X-GitHub-Event`, supported action, and observation time
- parsed GitHub App `pull_request` payload
- persisted delivery located by repository and pull-request number
- atomic observation-persistence port

## Outputs

- matched observation when installation, repository, URL, head branch and revision, and base branch still match
- diverged observation listing every changed immutable provider identity
- ignored outcome for unrelated events, unsupported actions, or pull requests not created by Patch Pilot
- replay or conflict outcome when GitHub redelivers or inconsistently reuses a delivery identity

## Adjacent parts

- [GitHub run ingestion](github-ingestion.md) owns raw-body signature verification and webhook-envelope extraction
- [GitHub delivery](github-delivery.md) creates the immutable provider evidence being compared
- Postgres implements the atomic observation port
- the maintenance workflow can translate matched lifecycle observations or divergence into later run events

## Reconciliation rules

The implemented provider-free use case handles `opened`, `reopened`, `synchronize`, `converted_to_draft`, `ready_for_review`, and `closed`. Pull-request state, draft state, and merged state are observations of legitimate human lifecycle activity and do not themselves indicate drift.

Installation, repository, GitHub URL, head branch, immutable head revision, and base branch remain bound to the original delivery. Any mismatch is recorded as `diverged`; reconciliation never force-updates GitHub or rewrites delivery evidence. Malformed supported payloads fail rather than being silently ignored.

Events other than `pull_request`, unsupported actions, and untracked pull requests are ignored without an observation write. One GitHub delivery identity may create one observation; an exact redelivery replays, while different evidence under the same identity conflicts. This follows GitHub's guidance to validate webhook signatures, inspect event and action, and use `X-GitHub-Delivery` as the replay identity.

## Persistence

The Postgres observation store creates one immutable row per GitHub delivery identity. Parameterized first-writer insertion records the complete pull-request lifecycle state, provider-identity comparison, difference list, and observation time. Database constraints enforce supported actions, valid pull-request state, full revisions, and agreement between matched/diverged status and the difference list.

When insertion loses a uniqueness race, the store reloads the winning row so the reconciliation use case can distinguish an exact replay from conflicting evidence. A missing winner after a rejected insert is treated as a persistence conflict rather than silently accepted.

The provider-free reconciliation use case, focused tests, delivery lookup, and atomic Postgres observation persistence are implemented. Raw signed HTTP ingestion remains planned.
