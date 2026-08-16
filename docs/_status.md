# Docs Status

The repository is using the indexed docs model under `docs/`.

Current reality:

- `_index.md` is the navigation layer.
- `README.md` is the human mental-model entrypoint for each docs folder.
- `_status.md` and `_decisions.md` are now part of the folder-level docs shape when their information is needed.
- `docs/DICTIONARY.md` is the canonical terminology file for this template's own docs and should be adapted as destination repositories grow their own stable terminology.
- `docs/architecture/` defines the architecture model for the greenfield monorepo.
- `boundaries.config.mjs` is the canonical executable registry for future workspaces, modules, and dependency permissions.
- Three deployable application workspaces and the conceptual maintenance package are registered and bootstrapped with tested public interfaces and narrow declared module edges.
- Local Temporal, Postgres, Redis, and Temporal UI services are defined in `compose.yaml` for development with pinned images and health checks.
- Signed GitHub issue-label deliveries can now produce an authenticated run submission bound to an immutable revision and one explicitly marked expected-failure fragment.
- Authenticated opted-in issue webhooks now resolve a repository-scoped full commit, reach atomic Postgres run persistence, and start a deterministic Temporal workflow through the executable API deployment.
- The maintenance package can materialize that revision in a disposable, verified Detached-HEAD repository workspace and remove it through a guarded cleanup operation.
- Supported Python/pytest and TypeScript/npm roots can be detected, and bounded command evidence can be matched against an issue's expected failure without executing untrusted commands on the host.
- Canonical MVP command and change policy is enforced before a sandbox port. A Docker adapter selects pinned runtimes, applies the fixed limits, copies the workspace into the quota-controlled container layer, and guarantees cleanup. The worker composes it with bounded shell-free Docker process execution; only live Docker proof remains required before target-repository commands can be enabled in deployment.
- The worker has an executable Temporal deployment and bundled maintenance workflow that records replay-safe inspection and reproduction events, uses fresh disposable exact-revision checkouts for both Activities, invokes the safe executor for supported projects, gates planning on accepted reproduction, terminates every other known outcome explicitly, and closes Temporal, Postgres, and Redis resources deterministically. Live Docker proof remains open.
- Bounded change proposals now tie a versioned plan to an independently measured unified diff and canonical safety decision.
- Proposal review now records standard verification evidence, structured critique outcomes, immutable attempt history, and no more than two modification retries.
- Run timelines now have concrete Postgres persistence, Redis live-stream adapters, a gap-free API catch-up feed, resumable SSE sessions, and an authenticated Node-compatible route handler; live service verification remains open because Docker is unavailable locally.
- The web shell renders a safe, responsive review document, loads same-origin style and EventSource assets, and starts an environment-configured Node server. Its bounded API client forwards only cookie or bearer credentials to the authenticated no-store review-evidence endpoint, while timeline and approval routes stream through unchanged. Desktop, mobile, overflow, controls, live insertion, and both deployment compositions are verified; live provider verification remains open.
- The API shell has an executable environment-backed deployment that composes shared authentication, one Postgres pool, canonical review-snapshot/timeline/approval stores, one Redis stream, one Temporal submission connection, GitHub ingestion and pull-request reconciliation, the Node listener, and signal-driven idempotent shutdown.
- Approval decisions have a tested domain use case for first-decision validation, required rejection reasons, idempotent replay, and competing-decision conflicts.
- Approval decisions also have a concrete Postgres adapter with database-enforced first-writer and idempotency constraints; only live service verification remains open.
- Approval submissions have an authenticated API route with required idempotency keys, stable HTTP outcomes, shared deployment authentication, and environment-backed store wiring.
- Markplane 0.1.2 manages version-controlled project work under `.markplane/`; its generated indexes and context summaries remain untracked and are regenerated with `npm run markplane:sync`.
- Markplane includes the canonical `docs/` tree when generating project context.
- `docs/product/` defines the Autonomous GitHub Maintainer product and its MVP boundaries.
- Product implementation is underway through the maintenance package and application shells; later workflow phases and remaining live provider verification remain open in Markplane.

Open questions:

- Destination repositories still need to decide which template workflow terms to keep, rename, or replace with their own repository vocabulary.
- The repository role, deployment units, and conceptual workspace boundaries remain open until the first concrete project is added.
