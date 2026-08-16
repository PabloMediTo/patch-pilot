# Maintenance Worker Runtime

## Responsibility

Run `maintenanceRunWorkflow` and its Activities on the configured Temporal task queue while owning the worker-side Temporal, Postgres, Redis, and disposable-workspace lifecycle.

## Not responsible for

- accepting GitHub webhooks or starting workflows
- storing workflow control decisions outside Temporal
- retaining repository checkouts between Activities
- providing Git credentials for repositories that are not reachable through a credential-free URL

## Inputs

- `PATCH_PILOT_TEMPORAL_ADDRESS`, `PATCH_PILOT_TEMPORAL_NAMESPACE`, and `PATCH_PILOT_TEMPORAL_TASK_QUEUE`
- `PATCH_PILOT_POSTGRES_URL` and `PATCH_PILOT_REDIS_URL`
- `PATCH_PILOT_WORKSPACE_ROOT` for generated disposable checkouts
- persisted submitted runs delivered by Temporal

## Outputs

- a registered deterministic `maintenanceRunWorkflow` bundle
- canonical `run.submitted` and inspection lifecycle timeline events
- a sanitized supported or unsupported project inspection without a local path
- deterministic provider cleanup after worker polling stops

## Adjacent parts

- [workflow submission](workflow-submission.md) starts the workflow on the same task queue
- [run timelines](run-timelines.md) persist Activity evidence before Redis publication
- [repository workspaces](repository-workspaces.md) create and remove the inspection checkout
- [supported project detection](project-detection.md) classifies the checked-out root
- later workflow phases will compose failure reproduction and proposal attempts

## First workflow phase

The Workflow records the canonical submitted event, records inspection start, and calls a separately configured inspection Activity. Timeline Activities use a 30-second start-to-close timeout and at most five infrastructure attempts. Inspection uses a ten-minute timeout and at most three attempts. Both use bounded exponential backoff.

The inspection Activity creates a checkout at the exact recorded revision, runs deterministic Python/TypeScript project detection, removes the checkout in `finally`, and removes its machine-local path from the durable result. It currently constructs a credential-free GitHub HTTPS URL, so the executable worker can inspect only repositories reachable without a future non-interactive Git credential provider.

The current workflow completes after this first inspection phase with explicit inspection evidence. Reproduction, modification attempts, review snapshot recording, approval waiting, and delivery are not yet orchestrated.

## Lifecycle

The executable worker reuses one native Temporal connection, one Postgres timeline store, and one Redis timeline stream. Temporal's Worker owns polling and graceful signal handling. Cleanup waits for polling to stop before closing Redis, Postgres, and the native connection; repeated closure shares one promise.
