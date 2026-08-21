# Workflow Submission

## Responsibility

Start one persisted [maintenance run](../DICTIONARY.md#maintenance-run) as a Temporal workflow with a deterministic identity and make webhook redelivery safe.

## Not responsible for

- persisting the initial run or advancing its product state
- implementing workflow steps or worker Activities
- hiding Temporal connectivity or authorization failures
- treating Redis or Temporal as the canonical run query store

## Inputs

- one persisted run in `submitted` state with its database-owned submission timestamp
- a Temporal address and namespace
- the maintenance worker task queue

## Outputs

- a started outcome containing the run and workflow identities
- an existing outcome when the same workflow identity was already started
- a visible provider failure so GitHub webhook redelivery can retry dispatch

## Adjacent parts

- [run persistence](run-persistence.md) supplies the canonical submitted run before dispatch
- [GitHub run ingestion](github-ingestion.md) returns the webhook acknowledgement after dispatch
- the [control-plane runtime](control-plane-runtime.md) owns the reusable Temporal client connection
- [workflow approval](workflow-approval.md) shares that connection for a separate persisted-decision command
- the [maintenance worker runtime](maintenance-worker-runtime.md) owns `maintenanceRunWorkflow` and its Activities

## Identity and retry rules

The persisted run ID is also the Temporal workflow ID. The API starts the named `maintenanceRunWorkflow` on the configured task queue and passes the complete canonical submitted run as its only argument. A successful first start is `started`; Temporal's exact already-started error is `existing`. No message matching or broad error conversion is used.

Persistence always happens before workflow submission. If Temporal is unavailable after the Postgres write, the webhook request fails visibly. GitHub can then redeliver the same delivery: Postgres reloads the first writer and the API retries the same deterministic Temporal start without creating a second workflow. Conflicting persisted identities never reach Temporal.

The executable worker now registers the workflow and advances a submitted run through inspection, reproduction, planning context, bounded proposal generation, proposal attempts, canonical review-snapshot recording, and an exactly bound durable approval wait. The API's separate workflow-approval role now wakes that wait; subsequent delivery remains an implementation responsibility.
