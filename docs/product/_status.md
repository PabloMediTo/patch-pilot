# Product Status

## Current reality

- The product idea and initial system boundaries are documented.
- Delivery is organized in Markplane epics and initial tasks.
- The API, worker, and web application shells have executable composition roots and public application interfaces.
- The maintenance package can create the initial `submitted` state for a run bound to a repository, issue, default branch, and immutable base revision while preserving compatibility with non-GitHub callers that omit the branch.
- A pinned [local development environment](../DICTIONARY.md#local-development-environment) provides Postgres, Redis, Temporal, and Temporal UI with readiness checks.
- Signed GitHub `issues` webhooks can request a run explicitly through the `patch-pilot` label, resolve an immutable base revision through an injected port, and emit an initial [run submission](../DICTIONARY.md#run-submission).
- A [repository workspace](../DICTIONARY.md#repository-workspace) can be created as a unique disposable checkout at an exact full commit SHA, with bounded non-interactive Git execution and guarded cleanup.
- Root manifests can identify one [supported project](../DICTIONARY.md#supported-project) as Python/pytest or TypeScript/npm and select its standard test command.
- [Failure reproduction](../DICTIONARY.md#failure-reproduction) classifies bounded executor evidence as reproduced, not reproduced, a different failure, or execution failure.
- The [MVP safety policy](../DICTIONARY.md#mvp-safety-policy) blocks unapproved commands, out-of-workspace execution, oversized diffs, and sensitive paths. Its Docker adapter maps the canonical no-network specification to pinned runtimes, copies the workspace into a quota-controlled container layer, and guarantees forced cleanup.
- A bounded [change proposal](../DICTIONARY.md#change-proposal) can now be generated only after reproduction: it records a versioned structured plan, derives file and line evidence from a unified diff, requires exact plan-to-diff file agreement, and applies the canonical change policy.
- Ready proposals can now produce immutable [verification evidence](../DICTIONARY.md#verification-evidence), structured [critique decisions](../DICTIONARY.md#critique-decision), and up to three visible [proposal attempts](../DICTIONARY.md#proposal-attempt) comprising the initial modification plus two retries.
- A [run timeline](../DICTIONARY.md#run-timeline) module now provides an idempotent Postgres schema, atomic per-run event sequences, ordered history queries, and run-scoped Redis publication/subscription. The API composes these into a gap-free feed, resumable SSE session, and authenticated `GET /runs/:runId/timeline` route. Its adapters are unit-tested but still require live verification against the local services.
- No Temporal workflow, concrete GitHub API adapter, control-plane API main-process authentication/store composition, or dependency restoration has been implemented.
- The worker now owns a shell-free, timeout- and output-bounded Docker CLI process port that returns standard command evidence.
- The worker composes that port with the immutable safety policy and Docker adapter into one target-repository command executor; blocked commands cannot reach Docker, and container identities are generated internally.
- The web application can build an immutable review model, safely render API-owned persisted evidence, stream live timeline entries, and expose state-gated approve/reject forms behind one same-origin dispatcher, concrete Node HTTP server, and environment-configured main process.
- The maintenance package validates human approval decisions, requires rejection reasons, binds the decision to canonical base-revision, diff, plan-version, and passed-verification hashes, replays matching idempotency keys, and prevents later competing decisions through an atomic first-writer persistence contract.
- Approval decisions have a concrete Postgres store with idempotent schema evolution, parameterized writes, database uniqueness constraints, evidence-binding columns, and existing-decision recovery after write conflicts; legacy unbound rows remain readable but cannot authorize delivery. Live verification remains open.
- The API exposes a framework-independent authenticated approval POST handler with required idempotency keys and stable success, replay, validation, authorization, and conflict responses.
- The web application exposes an authenticated review GET handler that loads evidence behind a port and serves escaped HTML with a no-script, same-origin-form content security policy.
- A same-origin browser asset connects to the authenticated timeline SSE route, listens for named `timeline` events, deduplicates sequences, and appends text-only audit entries without HTML insertion.
- The web HTTP dispatcher serves review pages and assets locally, forwards only timeline and approval routes through an injected API transport, and terminates unknown routes with 404.
- The web Node transport forwards request and response streams without buffering across HTTP or HTTPS, preserves upstream status and headers, and destroys the upstream request when the browser disconnects.
- The review interface has a self-hosted responsive stylesheet under a same-origin CSP. Browser checks verify its two-column desktop and single-column 375-pixel layouts, no page-level horizontal overflow, approval controls, and live timeline insertion.
- The API exposes an authenticated, no-store review-evidence GET handler. The web server's bounded client forwards only cookie or bearer credentials and maps available, unauthorized, and missing outcomes before rendering.
- The API now has a concrete Node listener and dispatcher for review evidence, approvals, and timeline SSE. It owns a 64-KiB default approval-body limit, JSON/form parsing, heartbeat scheduling, stable 404 responses, and safe 400/500 termination while domain providers remain injected.
- Browser approval actions now prevent native form submission, generate an idempotency key, send bounded JSON through the same origin, and reload canonical evidence only after success.
- A provider-free [GitHub delivery](../DICTIONARY.md#github-delivery) use case now gates publication against the exact approval binding, hashes the current diff, derives one safe deterministic branch, requires a linked draft pull request, and normalizes durable or concurrent retries. Concrete GitHub and Postgres delivery adapters remain open.
- Live runtime proof for CPU, memory, disk, timeout, output, and network enforcement remains open because Docker is unavailable locally; untrusted commands therefore stay disabled.
- Strict architecture enforcement permits the API ingestion role to use the maintenance package and the exact `node:buffer` and `node:crypto` providers.

## Next milestone

Implement the concrete GitHub App branch/pull-request adapter and atomic Postgres delivery store behind the provider-free delivery ports. Control-plane API authentication/store composition and live Postgres/Redis and Docker safety verification remain open where local runtime or policy decisions are still required.

## Open questions

- Which LLM provider and model policy will be used for the MVP?
- Will the first environment use self-hosted Temporal or Temporal Cloud?
- Which container runtime and outbound dependency-download policy are available in deployment?
