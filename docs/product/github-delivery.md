# GitHub Delivery

## Responsibility

Publish one exactly approved [pull-request proposal](../DICTIONARY.md#pull-request-proposal) as a deterministic branch and a linked draft pull request, with safe replay after retries or partial failure.

## Not responsible for

- deciding whether a proposal is approved
- changing or re-verifying proposal content
- merging the pull request
- owning GitHub credentials or durable workflow scheduling
- reconciling later pull-request lifecycle webhooks

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
- the [maintenance workflow](maintenance-workflow.md) invokes the worker Activity only after exact approval
- Postgres implements the atomic delivery-record port
- the GitHub REST adapter maps commit publication to branch references and draft-pull-request creation
- [GitHub installation authentication](github-installation-authentication.md) supplies short-lived write-capable installation tokens
- [GitHub delivery reconciliation](github-delivery-reconciliation.md) observes later pull-request lifecycle and provider drift without mutating this evidence

## Evidence gate

The delivery use case recomputes the SHA-256 hash of the exact unified source diff. It compares the resulting base revision, diff hash, plan version, passed verification status, and verification-evidence hash with the persisted approval binding. Rejected approvals, legacy unbound approvals, failed verification, and any later proposal mutation stop before a branch or pull request call.

## Deterministic publication

The branch name is `patch-pilot/` followed by the first 24 hexadecimal characters of the run identity's SHA-256 hash. This produces a valid, opaque, stable Git reference without relying on unsafe characters in an external run identifier.

The branch port receives the immutable base revision, exact diff, and diff hash. The pull-request port always receives `draft: true`, the retained default branch as its base, the deterministic branch as its head, and a `Fixes #<issue>` link. A provider response that is not an identified GitHub draft pull request is rejected and not persisted.

## Retry semantics

Delivery first checks durable evidence. A record matching the complete intent replays without provider calls; a different record conflicts. When no record exists, both provider ports must be idempotent: a retry after branch or pull-request creation can safely ensure the same resources again. The final delivery write uses an atomic created-or-existing contract, so a concurrent writer with the same intent becomes a replay while a different writer becomes a conflict.

## GitHub REST adapter

The implemented adapter publishes the approved commit through a separate commit-publication port, then reads the deterministic Git reference. It creates a missing `refs/heads/<branch>` reference, reuses a reference only when it points to the exact published commit, and resolves a concurrent GitHub `422` create response through one reread. It never force-updates an existing branch. This follows GitHub's [Git references REST contract](https://docs.github.com/en/enterprise-cloud@latest/rest/git/refs?apiVersion=2026-03-10).

For pull requests, the adapter lists all candidates for the exact repository owner, head branch, and base branch. It reuses exactly one candidate only when it is still open, is still a draft, and exposes the expected GitHub URL. Otherwise it creates a pull request with `draft: true`; a concurrent `422` response is recovered through the same exact list operation. Closed, non-draft, duplicate, or differently targeted candidates are conflicts rather than reasons to create another PR. This follows GitHub's [pull-request REST contract](https://docs.github.com/en/rest/pulls/pulls).

The low-level request port composes the shared [GitHub installation authentication](github-installation-authentication.md) boundary with the delivery-specific `contents:write` and `pull_requests:write` profile. Token format and length remain opaque. The authentication boundary follows GitHub's [JWT claims](https://docs.github.com/en/enterprise-cloud@latest/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-json-web-token-jwt-for-a-github-app) and [installation-token endpoint](https://docs.github.com/en/rest/apps/apps).

Every repository request carries GitHub's JSON media type, a fixed user agent, and the pinned `2026-03-10` API version. Only installation-scoped repository `GET` and `POST` routes are accepted. Fetch duration defaults to 15 seconds and parsed provider output defaults to one MiB; both are configurable positive limits. Credentials are confined to authorization headers and never included in returned errors. GitHub documents the version header and support window in its [REST API versioning contract](https://docs.github.com/en/rest/about-the-rest-api/api-versions).

The implemented commit-publication port independently rechecks the approved diff hash, reads the exact base commit and its complete recursive tree, and resolves only the files named by the diff. It accepts regular UTF-8 text files with modes `100644` or `100755`; renames, copies, binary content, path traversal, incomplete trees, mismatched hunk context, and non-file Git objects fail before any tree or commit write. New and deleted text files remain supported.

After exact patch application, the publisher creates a new tree from the immutable base tree and then one child commit of the immutable base revision. The commit message contains only hashes of the internal run identity and approved diff. A fixed Patch Pilot identity and the persisted approval-decision time make the Git object deterministic across retries. Provider responses must return the expected tree and sole parent before their commit SHA can become branch evidence. GitHub documents these content-addressed operations in its [Git blob](https://docs.github.com/en/enterprise-cloud@latest/rest/git/blobs), [Git tree](https://docs.github.com/en/enterprise-cloud@latest/rest/git/trees), and [Git commit](https://docs.github.com/en/enterprise-cloud@latest/rest/git/commits) contracts.

Keeping patch application separate from authentication and REST branch/PR replay prevents credentials, source transformation, and pull-request identity handling from becoming one inseparable mechanism. The publisher performs no local checkout mutation and receives credentials only through the injected authenticated request port.

The concrete Postgres store creates its schema idempotently and records the complete delivery, approval binding, immutable head, and draft-pull-request identity in one row per run. Database checks reinforce positive identifiers and plan versions, full revision and evidence-hash lengths, passed verification, and `draft: true`. Repository/branch and repository/pull-request uniqueness protect deterministic provider identities. An insert conflict reloads the run record for a matching replay; a conflicting provider identity belonging to another run remains an explicit conflict.

The worker's `github-delivery` application role composes one managed Postgres pool with the approval and delivery stores, authenticated GitHub App request transport, safe text-commit publisher, GitHub reference/draft-PR adapter, and provider-free use case. The workflow supplies only delivery evidence, not replacement ports. Shutdown closes the pool once and prevents later Activity calls. The API's separate `github-delivery` role now owns only persisted pull-request webhook reconciliation, so publication has one executable owner.

The provider-free use case, Postgres store, authenticated transport, commit publisher, reference/draft-PR adapter, worker Activity composition, API reconciliation composition, and focused tests are implemented. Live Postgres/GitHub verification remains planned.
