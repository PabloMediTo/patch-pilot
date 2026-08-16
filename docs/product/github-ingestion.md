# GitHub Run Ingestion

## Responsibility

Authenticate bounded GitHub App webhook deliveries, extract their immutable envelope, and dispatch authenticated payloads. For `issues` events, translate an explicit opt-in into a [run submission](../DICTIONARY.md#run-submission).

## Not responsible for

- fetching repository contents
- executing the maintenance workflow
- owning the run-persistence schema or Temporal submission policy
- accepting unsigned or implicit issue activity as authorization

## Inputs

- the unmodified webhook request body
- `X-Hub-Signature-256`, `X-GitHub-Event`, and `X-GitHub-Delivery` header values
- the configured GitHub App webhook secret
- an `issues` event whose action is `labeled` and whose label is `patch-pilot`
- a trimmed issue title of at most 500 characters
- non-empty descriptive issue context outside the expected-failure marker, limited to 8,000 characters
- exactly one expected-failure fragment of at most 500 characters, delimited in the issue body by `<!-- patch-pilot:expected-failure -->` and `<!-- /patch-pilot:expected-failure -->`

## Outputs

- an accepted initial run bound to the GitHub delivery, installation, repository, default branch, issue number, bounded [issue context](../DICTIONARY.md#issue-context), actor, resolved immutable base revision, and exact expected-failure fragment
- an authenticated envelope containing delivery identity, event name, parsed object payload, and server observation time for downstream consumers
- an ignored result for valid deliveries that do not explicitly request a run
- stable HTTP rejection for invalid signatures, missing envelope headers, oversized bodies, invalid JSON, or malformed triggering payloads

## Adjacent parts

- the control-plane Node server bounds the body while preserving its exact UTF-8 text
- [GitHub delivery reconciliation](github-delivery-reconciliation.md) consumes authenticated pull-request envelopes
- the GitHub revision port resolves the repository default branch to an immutable commit SHA
- the maintenance package creates the initial run state
- [run persistence](run-persistence.md) atomically records accepted submissions before [workflow submission](workflow-submission.md)

## Authentication and opt-in

The signature is calculated over the untouched UTF-8 body with HMAC-SHA256 and compared in constant time. Payload parsing happens only after verification.

The implemented `POST /github/webhooks` route applies the API's 64-KiB default body limit, rejects invalid signatures with `401`, rejects malformed authenticated envelopes with `400`, and acknowledges accepted, ignored, or recorded deliveries with `202`. A reused delivery identity containing conflicting evidence returns `409`. Responses are JSON and disable caching.

Opening or editing an issue does not start a run. A maintainer requests a run by applying the exact `patch-pilot` label. After the HTTP handler authenticates and parses the envelope, the ingestion role routes `pull_request` events to delivery reconciliation and interprets other events only as possible issue submissions. It resolves the requested repository's default branch through the repository-scoped GitHub App transport and accepts only a successful full commit SHA before constructing the run.

The opted-in issue body must contain exactly one bounded expected-failure marker pair. The trimmed text between the markers is persisted verbatim and later matched as an exact output fragment during reproduction. The remaining trimmed body becomes the bounded descriptive issue context used by later planning. Missing, empty, duplicated, or oversized title, context, or marker content is rejected as a malformed triggering payload instead of truncating evidence or inferring failure evidence from unrestricted prose.

The GitHub delivery identifier becomes part of the run identity so the Postgres persistence adapter can make repeated deliveries idempotently across both run and source-delivery identities. A first writer returns `accepted`, the one unambiguous stored winner returns `replayed`, and unresolved or split-identity evidence returns `conflict`. Accepted and replayed outcomes dispatch the canonical persisted run through the Temporal port before acknowledging the webhook; conflicts never dispatch. The submitted run retains the reviewed default branch and immutable commit so later pull-request delivery never reinterprets repository defaults.
