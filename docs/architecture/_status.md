# Architecture Status

## Current baseline

- This repository is configured as a greenfield monorepo using npm workspaces.
- The deployable application shells are `apps/maintainer-api`, `apps/maintainer-worker`, and `apps/maintainer-web`.
- The non-deployable conceptual package is `packages/maintenance`.
- Every registered workspace uses `src/` as its production source root.
- Each application shell exposes one `application` role module plus explicit `index.js` and `main.js` composition files.
- The worker additionally exposes the `docker-cli` application role, which owns bounded shell-free Docker process execution and alone receives the exact `node:child_process` provider permission.
- The worker exposes `sandbox-execution` as the application role that composes the maintenance package's public safety interface with `docker-cli`; it receives only the exact workspace edge, module edge, and `node:crypto` provider needed for that responsibility.
- The worker exposes `maintenance-workflow` as the application role that owns deterministic orchestration and concrete Activities with only the exact `@temporalio/workflow` provider. Its Activities depend on the public `sandbox-execution` role to reproduce failures without weakening policy. The separate `proposal-generation` application role owns OpenAI Responses HTTP composition and receives only `node:buffer` for response-size enforcement. The worker `application` role alone imports `@temporalio/worker` and `node:url`, composes workflow and proposal-generation public interfaces, and `main.js` receives only `node:process`.
- The API shell also exposes the `github-ingestion` application role, which depends on the maintenance workspace and the exact Node.js cryptography providers needed for webhook authentication.
- The API shell exposes `api-http` as the route-composition role with only public edges to approval, review-evidence, and timeline handlers.
- The API shell exposes `api-server` as the Node transport role with only `api-http` plus exact `node:buffer`, `node:http`, `node:timers`, and `node:url` providers for bounded bodies, listening, heartbeat lifecycle, and form decoding.
- The maintenance package exposes the conceptual `runs` module, which owns initial run validation and atomic submitted-run Postgres persistence with only the exact `pg` provider permission.
- The maintenance package exposes `approvals`, which owns first-decision validation, idempotent replay, persistence conflict outcomes, and its Postgres adapter with the exact `pg` provider permission.
- The maintenance package also exposes `repository-workspaces`, which owns disposable Git checkout and cleanup and uses only its exact filesystem, process, path, and utility core providers.
- The maintenance package exposes `repository-understanding` for project detection and bounded planning-context collection. It receives only exact filesystem/path providers and one public edge to `safety`, which owns context visibility and size policy. `reproductions` remains independent and depends only on its injected executor contract.
- The maintenance package exposes `safety`, which owns canonical execution and change policy plus Docker container command construction and cleanup. It uses only `node:path` for workspace/path containment and delegates bounded Docker CLI execution through an injected port.
- The maintenance package exposes `change-proposals`, which owns bounded plan and unified-diff proposal generation, uses `node:path` for portable repository paths, and depends only on the public `safety` interface.
- The maintenance package exposes independent `verifications` and `critiques` concepts with injected executor and reviewer ports, plus `proposal-attempts` to compose only their public interfaces into the bounded retry loop.
- The maintenance package exposes `run-timelines`, which owns canonical Postgres event persistence and Redis fan-out and has exact `pg`, `redis`, and `node:util` permissions without module dependencies; deep equality rejects conflicting deterministic event replays independent of JSON object key order.
- The API shell exposes `run-timeline-feed` as the application role that imports the maintenance package root and composes persisted history, live subscription, and framework-independent SSE sessions; its index composes application, ingestion, and feed interfaces.
- The API shell exposes `run-timeline-http` as a separate route/authentication role. It depends only on the public `run-timeline-feed` interface and exact `node:url` provider.
- The API shell exposes `run-approval-http` as a separate authenticated command role. It imports only the maintenance package root and exact `node:url` provider; auth, body reading, persistence, and clock remain injected ports.
- The API shell exposes provider-isolated `run-review-evidence-http` for authenticated, no-store review evidence reads with only exact `node:url`; authorization and persistence remain injected ports.
- The API shell exposes provider-free `run-review-query` to join review-snapshot, timeline, and approval store interfaces without owning persistence; `application` depends on this role to supply evidence and exact approval state to the server.
- The API `application` role owns deployment composition and imports the `github-delivery` and `github-ingestion` public interfaces plus exact `pg`; it creates one shared pool for all API Postgres stores. API `main.js` uses only `application` and exact `node:process` for listener startup and shutdown signals.
- The API shell exposes `workflow-submission` as the application role that alone imports the exact `@temporalio/client` provider. The `application` role depends on its public interface to compose one reusable connection with persisted issue ingestion and deterministic shutdown.
- The web shell exposes `run-review` as an independent application role with no provider or workspace dependencies; it owns the immutable review model and safe HTML presentation.
- The web shell exposes `run-review-http` for authenticated review delivery. It depends only on the public `run-review` interface and exact `node:url` provider; authorization and evidence loading remain injected ports.
- The web shell exposes provider-free `run-review-live` for the same-origin browser SSE asset; it remains independent of server rendering and persistence modules.
- The web shell exposes provider-free `run-review-style` for the same-origin responsive stylesheet; presentation styling remains independent of live-event behavior and server rendering.
- The web shell exposes `run-review-api` as the bounded server-side evidence client. It uses only exact Node buffer, HTTP, HTTPS, and URL providers and forwards only cookie or bearer credentials.
- The web shell exposes `web-http` as the same-origin route composition role. It depends only on `run-review-http`, `run-review-live`, and exact `node:url`; API forwarding remains an injected port.
- The web shell exposes `web-server` as the Node runtime role. It depends only on `web-http`, `run-review-api`, and the exact `node:http`, `node:https`, and `node:url` providers needed to create the listener and streaming API transport.
- The web `main.js` now composes application identity and `web-server`, reads only its host, port, and API origin through exact `node:process`, validates the TCP port, and starts the listener.
- The maintenance package index composes all public maintenance concepts. Explicit package-module edges are limited to `change-proposals` → `safety`, `repository-understanding` → `safety`, and `proposal-attempts` → `verifications`/`critiques`; `approvals` remains independent. Worker application-level edges are `sandbox-execution` → `docker-cli`, `maintenance-workflow` → `sandbox-execution`, and `application` → `maintenance-workflow`/`proposal-generation`. Proposal generation adds the exact `node:buffer` permission and no external dependency or technical exception.
- Repository topology, repository role, workspace architectural role, and deployment status remain separate decisions.
- Monorepo application workspaces are deployable composition shells.
- Monorepo package workspaces represent product or application concepts unless
  a concrete technical constraint is recorded as an exception.
- First-level folders in each source root represent conceptual modules or
  explicit application roles. Legacy or generated technical folders must be
  marked as documented technical exceptions rather than relabeled as concepts.
- Second-level folders normally represent vertical slices, use cases, or focused
  change paths within a first-level module.
- `boundaries.config.mjs` is the sole executable registry for topology, source
  coverage, modules, composition files, and allowed dependencies.
- Workspace and module dependency graphs reject unknown references, self-edges,
  and cycles.
- External packages and Node.js core modules use exact owner-level allow-lists.
  Arbitrary third-party access is not permitted by default.
- Cross-module imports use target module index files. Cross-workspace imports
  use exact package roots; relative traversal and package subpaths do not bypass
  those public interfaces.
- Production files cannot import test files. Tests may use same-workspace public
  module interfaces, their workspace's package dependencies, and the explicit
  test dependency allow-lists.
- `eslint-plugin-boundaries` 7.1 is configured with import, export, CommonJS
  require, and dynamic-import dependency nodes and strict unknown-file checks.
- Inline ESLint configuration is disabled, and warnings fail the lint command.
- The local ESLint rules and boundary translator have reusable Node test suites.
- No standalone architecture-fitness checker or fitness configuration exists.

## Pending decisions

When production source is introduced, this repository must decide explicitly:

- which workspaces and first-level modules are genuine concepts
- which narrow technical exceptions already have a concrete lifecycle,
  deployment, security, versioning, generation, or ownership reason
- which workspace, module, composition, provider, Node.js core, and test
  dependency edges are currently required
- which framework-required default exports need narrow file-specific ESLint
  exceptions
- whether an existing repository needs a documented migration sequence before
  it can satisfy strict coverage

Unknowns must be derived from product docs, manifests, build configuration, and actual dependency use rather than guessed from folder names.
