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
- `PATCH_PILOT_OPENAI_API_KEY` and optional `PATCH_PILOT_OPENAI_MODEL` for structured proposal generation
- persisted submitted runs delivered by Temporal

## Outputs

- a registered deterministic `maintenanceRunWorkflow` bundle
- canonical submission, inspection, reproduction, planning-context, and proposal lifecycle timeline events
- an accepted final-attempt outcome or explicit terminal classified outcome
- a sanitized supported or unsupported project inspection without a local path
- classified reproduction evidence from the safe command executor for supported projects
- bounded repository planning context after accepted reproduction
- immutable proposal-attempt history after apply, verify, critique, and bounded revision
- one atomically persisted immutable review snapshot after an accepted final attempt
- one durable approval wait that resolves only an exactly bound persisted decision
- deterministic provider cleanup after worker polling stops

## Adjacent parts

- [workflow submission](workflow-submission.md) starts the workflow on the same task queue
- [run timelines](run-timelines.md) persist Activity evidence before Redis publication
- [repository workspaces](repository-workspaces.md) create and remove the inspection checkout
- [supported project detection](project-detection.md) classifies the checked-out root
- [repository planning context](repository-planning-context.md) selects safe relevant text evidence
- [proposal generation](proposal-generation.md) owns the provider adapter and credential boundary
- the control-plane API will signal persisted decisions and later workflow phases will compose delivery

## Implemented workflow phases

The Workflow records the canonical submitted event, runs inspection, and then either records an explicit unsupported reproduction skip or calls the reproduction Activity. Timeline Activities use a 30-second start-to-close timeout and at most five infrastructure attempts. Inspection and reproduction use a ten-minute timeout and at most three attempts. Both use bounded exponential backoff.

The inspection Activity creates a checkout at the exact recorded revision, runs deterministic Python/TypeScript project detection, removes the checkout in `finally`, and removes its machine-local path from the durable result. It currently constructs a credential-free GitHub HTTPS URL, so the executable worker can inspect only repositories reachable without a future non-interactive Git credential provider.

The reproduction Activity deliberately creates another fresh checkout rather than reusing an Activity-local path. It re-detects the project and passes its standard command, workspace boundary, and the persisted expected-failure fragment through the worker's canonical safe executor. The workflow accepts only the known reproduction classifications. Every valid non-reproduced classification records an explicit terminal event, while malformed Activity evidence fails visibly.

After accepted reproduction, a separate Activity creates a third checkout, collects bounded repository planning context, and removes the workspace in `finally`. Ready context records planning readiness; unavailable or malformed context terminates or fails explicitly. A five-minute, three-attempt proposal Activity uses the worker-owned OpenAI Responses adapter and the maintenance package's bounded proposal use case. Ready and policy-blocked outcomes are distinct; malformed provider or Activity evidence fails visibly.

A separate 30-minute Activity creates a fourth exact-revision checkout and executes the existing apply-verify-critique loop. Every attempt resets that checkout to the immutable base, applies a complete checked diff, runs the supported command through the canonical safe executor, and invokes the structured reviewer only after passing verification. Failed verification requests a full revised proposal with the exact next plan version; two modification retries are permitted. The Activity awaits the whole loop before cleanup, while `finally` still guarantees removal after success or failure. Timeline evidence includes bounded verification and critique summaries but omits unified diffs.

After an accepted final attempt, a short retryable Activity creates and atomically persists the canonical review snapshot through the worker-owned Postgres review store. An exact retry returns the existing first-writer evidence; a different row for the same run fails visibly. The workflow records `run.review.started`, then publishes `run.review.ready` with only the exact binding, persistence classification, and recording time.

The workflow registers its `reviewDecision` signal handler before orchestration and then records `run.approval.waiting`. Temporal's durable condition resolves only for an approved or rejected decision whose run identity and complete review binding match the persisted snapshot. Invalid signals remain non-terminal. A valid approval advances the workflow to `approved`; rejection records the reason and terminates as `approval-rejected`. The worker closes its review store together with the timeline and Redis resources. Dependency installation, API-to-Temporal decision signaling, and delivery are not yet orchestrated. Live Docker safety verification remains required before enabling target command execution for untrusted deployed repositories.

## Lifecycle

The executable worker reuses one native Temporal connection, one Postgres timeline store, one Postgres review store, and one Redis timeline stream. Temporal's Worker owns polling and graceful signal handling. Cleanup waits for polling to stop before closing Redis, both Postgres stores, and the native connection; repeated closure shares one promise.
