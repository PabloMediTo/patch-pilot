## Repo Rules

### Docs Workflow

* For every substantive prompt, first use the `global-docs-router` skill.
* Follow the repository documentation model and maintenance rules defined under `docs/process/`.
* When reading a concrete source or configuration file, use the `colocated-docs-reader` skill to check for an adjacent `*.docs.md` file.
* When modifying a file under `docs/`, use the `global-docs-maintainer` skill.
* When docs or repository instructions change important repository terminology, use the `business-dictionary-maintainer` skill.
* When modifying a concrete source or configuration file, use the `colocated-docs-maintainer` skill to update an existing adjacent `*.docs.md` file if it exists and is affected.
* Do not create new co-located `*.docs.md` files as part of normal maintenance. Those files are created manually and only when explicitly requested.

### Architecture Philosophy And Enforcements

* When a task affects source layout, workspace or module boundaries, dependency direction, implementation conventions, or ESLint enforcement, read `docs/architecture/_index.md` and route to the smallest sufficient documents.
* Use `$adopt-architecture-template` when installing or reapplying the architecture layer. Determine whether the target is a monorepo or a single-package repository before changing it; ask the user when the evidence is ambiguous.
* Use `$maintain-architecture-boundaries` when adding, removing, renaming, or reconnecting a workspace, first-level source module, composition file, or external dependency permission.
* Treat `boundaries.config.mjs` as the canonical executable registry for source roots and allowed dependency edges. Do not duplicate its edge lists in docs or maintain competing per-workspace maps.
* In a monorepo, application workspaces are thin deployable composition shells and package workspaces represent product or application concepts. First-level folders inside every `src/` root represent conceptual modules or explicit application roles, not generic technical layers.
* A technical workspace or first-level module is allowed only for a concrete lifecycle, deployment, security, versioning, generation, or ownership constraint. Mark it as a documented technical exception and record the reason in `boundaries.config.mjs` and the architecture docs.
* Keep architecture docs and enforcement aligned. Changes to `boundaries.config.mjs`, `eslint.config.mjs`, `eslint-boundaries/`, or `eslint-local-rules/` require the relevant `docs/architecture/` update in the same change.
* Prefer explicit repository-local permissions over broad globs or weakened defaults. Remove stale permissions when their importing code disappears.
* Add another enforcement mechanism only for a concrete, documented gap that ESLint cannot observe; do not create a parallel boundary system.
