# Product Status

## Current reality

- The product idea and initial system boundaries are documented.
- Delivery is organized in Markplane epics and initial tasks.
- The API, worker, and web application shells have executable composition roots and public application interfaces.
- The maintenance package can create the initial `submitted` state for a run bound to a repository, issue, and immutable base revision.
- A pinned [local development environment](../DICTIONARY.md#local-development-environment) provides Postgres, Redis, Temporal, and Temporal UI with readiness checks.
- Signed GitHub `issues` webhooks can request a run explicitly through the `patch-pilot` label, resolve an immutable base revision through an injected port, and emit an initial [run submission](../DICTIONARY.md#run-submission).
- A [repository workspace](../DICTIONARY.md#repository-workspace) can be created as a unique disposable checkout at an exact full commit SHA, with bounded non-interactive Git execution and guarded cleanup.
- Root manifests can identify one [supported project](../DICTIONARY.md#supported-project) as Python/pytest or TypeScript/npm and select its standard test command.
- [Failure reproduction](../DICTIONARY.md#failure-reproduction) classifies bounded executor evidence as reproduced, not reproduced, a different failure, or execution failure.
- The [MVP safety policy](../DICTIONARY.md#mvp-safety-policy) blocks unapproved commands, out-of-workspace execution, oversized diffs, and sensitive paths. Its Docker adapter maps the canonical no-network specification to pinned runtimes, copies the workspace into a quota-controlled container layer, and guarantees forced cleanup.
- A bounded [change proposal](../DICTIONARY.md#change-proposal) can now be generated only after reproduction: it records a versioned structured plan, derives file and line evidence from a unified diff, requires exact plan-to-diff file agreement, and applies the canonical change policy.
- Ready proposals can now produce immutable [verification evidence](../DICTIONARY.md#verification-evidence), structured [critique decisions](../DICTIONARY.md#critique-decision), and up to three visible [proposal attempts](../DICTIONARY.md#proposal-attempt) comprising the initial modification plus two retries.
- A [run timeline](../DICTIONARY.md#run-timeline) module now provides an idempotent Postgres schema, atomic per-run event sequences, ordered history queries, and run-scoped Redis publication/subscription. The API composes these into a gap-free feed, resumable SSE session, and authenticated `GET /runs/:runId/timeline` route. Its adapters are unit-tested but still require live verification against the local services.
- No Temporal workflow, concrete GitHub API adapter, web main-process session/evidence composition, or dependency restoration has been implemented.
- The worker now owns a shell-free, timeout- and output-bounded Docker CLI process port that returns standard command evidence.
- The worker composes that port with the immutable safety policy and Docker adapter into one target-repository command executor; blocked commands cannot reach Docker, and container identities are generated internally.
- The web application can build an immutable review model, safely render persisted evidence, stream live timeline entries, and expose state-gated approve/reject forms behind one same-origin dispatcher and concrete Node HTTP server. Main-process session/evidence composition remains open.
- The maintenance package validates human approval decisions, requires rejection reasons, replays matching idempotency keys, and prevents later competing decisions through an atomic first-writer persistence contract.
- Approval decisions have a concrete Postgres store with idempotent schema initialization, parameterized writes, database uniqueness constraints, and existing-decision recovery after write conflicts; live verification remains open.
- The API exposes a framework-independent authenticated approval POST handler with required idempotency keys and stable success, replay, validation, authorization, and conflict responses.
- The web application exposes an authenticated review GET handler that loads evidence behind a port and serves escaped HTML with a no-script, same-origin-form content security policy.
- A same-origin browser asset connects to the authenticated timeline SSE route, listens for named `timeline` events, deduplicates sequences, and appends text-only audit entries without HTML insertion.
- The web HTTP dispatcher serves review pages and assets locally, forwards only timeline and approval routes through an injected API transport, and terminates unknown routes with 404.
- The web Node transport forwards request and response streams without buffering across HTTP or HTTPS, preserves upstream status and headers, and destroys the upstream request when the browser disconnects.
- The review interface has a self-hosted responsive stylesheet under a same-origin CSP. Browser checks verify its two-column desktop and single-column 375-pixel layouts, no page-level horizontal overflow, approval controls, and live timeline insertion.
- Live runtime proof for CPU, memory, disk, timeout, output, and network enforcement remains open because Docker is unavailable locally; untrusted commands therefore stay disabled.
- Strict architecture enforcement permits the API ingestion role to use the maintenance package and the exact `node:buffer` and `node:crypto` providers.

## Next milestone

Verify timeline adapters against live Postgres and Redis, then expose persisted history and live events to the review interface while durable workflow orchestration is added.

## Open questions

- Which LLM provider and model policy will be used for the MVP?
- Will the first environment use self-hosted Temporal or Temporal Cloud?
- Which container runtime and outbound dependency-download policy are available in deployment?
- Should approved delivery immediately open a draft pull request or first expose a final proposal for a second confirmation?
