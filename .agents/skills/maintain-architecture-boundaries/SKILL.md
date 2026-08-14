---
name: maintain-architecture-boundaries
description: Maintain the canonical architecture boundary registry and aligned ESLint enforcement. Use when adding, removing, renaming, moving, or reconnecting a workspace, first-level source module, composition file, package dependency, external provider, Node.js core import, source root, deployment role, or documented technical exception.
---

# Maintain Architecture Boundaries

Treat a boundary change as an architecture decision, not merely a lint fix.

## Establish the current fact

Read:

- `../../../docs/architecture/_index.md`
- `../../../docs/architecture/module-organization.md`
- `../../../docs/architecture/boundaries.md`
- `../../../docs/architecture/eslint.md`
- `../../../boundaries.config.mjs`

Inspect the importing code and current dependency use. `boundaries.config.mjs`
is the canonical executable registry; do not create a second workspace-local map
or reproduce its edge lists in docs.

## Apply the conceptual gate

Before adding a workspace or first-level module, identify the product concept or
application role it owns.

Do not approve a generic technical layer because it is convenient. A technical
boundary needs a current independent lifecycle, deployment, security,
versioning, generation, or ownership constraint and an `exceptionReason`.

Keep topology, repository role, deployment status, workspace role, and module
role separate. A package is not automatically conceptual, and an application
shell is not automatically the owner of all behavior it executes.

## Update the narrowest registry fact

- Add or rename workspace identities, paths, package names, source roots, or
  deployment metadata only when those repository facts change.
- Add a module with its architecture role and exact dependency arrays.
- Add a cross-module edge only for a current dependency on the target public
  index.
- Add a cross-workspace edge by target workspace identifier; imports use its
  exact package root.
- Add composition files individually with only the modules and providers they
  compose.
- Add third-party or `node:` core specifiers to the importing owner, not a
  repository-wide wildcard.
- Use global test allow-lists only for genuine test-only providers.

Never answer an unknown-file or dependency error by shrinking
`productionFiles`, adding a catch-all module, allowing package subpaths, or
globally permitting providers.

When code is removed or moved, audit the old owner. Remove stale module,
workspace, external, core, composition, and test permissions with their final
use. The validator must continue to reject unknown references, self-edges, and
cycles.

## Keep explanation and enforcement aligned

Update the smallest relevant architecture docs when concepts, terminology,
exceptions, or behavior change. Docs explain rationale; the registry retains
the edge data.

If the registry schema or translator semantics change, update together:

- `../../../eslint-boundaries/validateBoundaryConfig.mjs`
- `../../../eslint-boundaries/createArchitectureBoundaryConfig.mjs`
- both files under `../../../examples/`
- `../../../eslint-boundaries.test.js`
- `../../../docs/architecture/boundaries.md`
- `../../../docs/architecture/eslint.md`

Do not add a generic architecture-fitness checker. A separate enforcement
mechanism requires a concrete documented rule outside ESLint's observable
source/import model and its own focused tests.

## Verify the change

Run `npm run check` or the destination's equivalent full command. Add or update
tests for both the newly allowed path and the nearest denied bypass. For schema
changes, keep both topology examples valid.

Report the conceptual or operational reason for the change, exact permissions
added and removed, exception rationale if any, docs updated, and verification
results.
