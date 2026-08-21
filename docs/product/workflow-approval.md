# Workflow Approval

## Responsibility

Signal one canonically persisted human [approval decision](../DICTIONARY.md#approval-decision) to the matching durable maintenance workflow before the API acknowledges success.

## Not responsible for

- authenticating the human operator
- deciding or persisting the first approval decision
- validating proposal quality or changing review evidence
- publishing a GitHub branch or pull request

## Inputs

- a created or idempotently replayed approval decision from Postgres
- its run ID, actor, idempotency key, decision time, and exact review binding
- the API-owned reusable Temporal client

## Outputs

- one `reviewDecision` signal sent to the workflow whose ID equals the run ID
- a visible provider failure when Temporal cannot accept the signal
- no signal for validation failures or competing approval decisions

## Adjacent parts

- the authenticated approval HTTP route persists the first decision before signaling
- [review snapshots](review-snapshots.md) supply the binding copied into the decision
- the [maintenance workflow](maintenance-workflow.md) filters the signal against its expected run and binding
- the [control-plane runtime](control-plane-runtime.md) owns the shared Temporal connection

## Ordering and retry rules

The approval route first executes the provider-free first-decision use case. Only `created` and exact `replayed` outcomes reach the Temporal notifier. Conflicts return without signaling.

The notifier validates the full persisted decision shape, obtains the workflow handle by run ID, and sends the exact decision as the single `reviewDecision` argument. The handler writes its 201 or 200 response only after Temporal accepts the signal. A signaling failure remains an HTTP 500, so the client can retry with the same idempotency key; Postgres then returns the canonical replay and the route retries the same signal without creating another decision.

The worker independently rejects a different run ID, malformed decision, failed-verification binding, or any binding mismatch. Signal delivery never replaces Postgres as the canonical decision record.
