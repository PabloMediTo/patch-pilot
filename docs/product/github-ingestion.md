# GitHub Run Ingestion

## Responsibility

Authenticate GitHub App webhook deliveries and translate an explicit issue opt-in into a [run submission](../DICTIONARY.md#run-submission).

## Not responsible for

- fetching repository contents
- executing the maintenance workflow
- persisting runs or scheduling Temporal workflows
- accepting unsigned or implicit issue activity as authorization

## Inputs

- the unmodified webhook request body
- `X-Hub-Signature-256`, `X-GitHub-Event`, and `X-GitHub-Delivery` header values
- the configured GitHub App webhook secret
- an `issues` event whose action is `labeled` and whose label is `patch-pilot`

## Outputs

- an accepted initial run bound to the GitHub delivery, installation, repository, issue, actor, and resolved immutable base revision
- an ignored result for valid deliveries that do not explicitly request a run
- an error for an invalid signature or malformed triggering payload

## Adjacent parts

- the control-plane transport preserves the raw body and supplies header values
- the GitHub revision port resolves the repository default branch to an immutable commit SHA
- the maintenance package creates the initial run state
- future persistence and Temporal adapters consume accepted run submissions idempotently

## Authentication and opt-in

The signature is calculated over the untouched UTF-8 body with HMAC-SHA256 and compared in constant time. Payload parsing happens only after verification.

Opening or editing an issue does not start a run. A maintainer requests a run by applying the exact `patch-pilot` label. The GitHub delivery identifier becomes part of the run identity so the persistence adapter can make repeated deliveries idempotent.
