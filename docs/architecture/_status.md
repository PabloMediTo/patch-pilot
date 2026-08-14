# Architecture Status

## Current baseline

- This repository is configured as a greenfield monorepo using npm workspaces.
- The deployable application shells are `apps/maintainer-api`, `apps/maintainer-worker`, and `apps/maintainer-web`.
- The non-deployable conceptual package is `packages/maintenance`.
- Every registered workspace uses `src/` as its production source root.
- Each application shell exposes one `application` role module plus explicit `index.js` and `main.js` composition files.
- The API shell also exposes the `github-ingestion` application role, which depends on the maintenance workspace and the exact Node.js cryptography providers needed for webhook authentication.
- The maintenance package exposes the conceptual `runs` module.
- The maintenance package also exposes `repository-workspaces`, which owns disposable Git checkout and cleanup and uses only its exact filesystem, process, path, and utility core providers.
- The maintenance package exposes independent `repository-understanding` and `reproductions` concepts; detection may read root files, while reproduction depends only on its injected executor contract.
- The maintenance package exposes `safety`, which owns canonical execution and change policy plus Docker container command construction and cleanup. It uses only `node:path` for workspace/path containment and delegates bounded Docker CLI execution through an injected port.
- The maintenance package exposes `change-proposals`, which owns bounded plan and unified-diff proposal generation, uses `node:path` for portable repository paths, and depends only on the public `safety` interface.
- The maintenance package exposes independent `verifications` and `critiques` concepts with injected executor and reviewer ports, plus `proposal-attempts` to compose only their public interfaces into the bounded retry loop.
- The maintenance package exposes `run-timelines`, which owns canonical Postgres event persistence and Redis fan-out and has exact `pg` and `redis` provider permissions without module dependencies.
- The API shell exposes `run-timeline-feed` as the application role that imports the maintenance package root and composes persisted history, live subscription, and framework-independent SSE sessions; its index composes application, ingestion, and feed interfaces.
- The API shell exposes `run-timeline-http` as a separate route/authentication role. It depends only on the public `run-timeline-feed` interface and exact `node:url` provider.
- The maintenance package index composes all public maintenance concepts. Explicit module edges remain limited to `change-proposals` → `safety` and `proposal-attempts` → `verifications`/`critiques`.
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
