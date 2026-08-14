# ESLint Enforcement

ESLint is the template's default static enforcement surface for JavaScript and
TypeScript architecture. It enforces both the canonical dependency registry and
source-file conventions.

## Boundary enforcement

`eslint-boundaries/createArchitectureBoundaryConfig.mjs` validates
`boundaries.config.mjs` and uses `eslint-plugin-boundaries/config` to create a
flat config from the plugin's strict preset.

The generated settings:

- use the repository root for one topology-wide classification model
- declare one unique element type for every registered workspace/module pair
- declare file categories for explicit composition files and source-root tests
- flag internal package names and their subpaths as external import sources so
  package-root policies work even when an alias is unresolved
- inspect `import`, `export`, `require`, and dynamic `import()` nodes

The generated `boundaries/dependencies` rule defaults to disallow and checks all
origins, unknown local dependencies, and dependencies internal to one element.
Policies then permit only the exact relationships described in
[boundaries.md](boundaries.md).

The strict unknown-file and unknown-dependency rules are significant. Broad
`productionFiles` globs make an unregistered workspace or first-level source
folder fail instead of becoming an unenforced island. Do not narrow those globs
to hide legacy code; register it honestly as a concept or documented migration
exception.

Node and TypeScript import resolvers are configured for common JavaScript and
TypeScript extensions. A destination repository must add resolver settings for
its real aliases or framework resolution rules. Resolver failures should be
fixed rather than answered with broad boundary permissions.

## Local source rules

- `max-lines` keeps files below 300 non-comment, non-blank lines.
- `max-lines-per-function` keeps functions below 60 such lines.
- `max-params` limits functions to three parameters.
- `max-statements` limits functions to 15 statements.
- `import/no-cycle` rejects file-level cycles.
- `import/no-default-export` keeps imports searchable and renameable.
- `local/index-reexports-only` keeps index files pure explicit interfaces.
- `local/require-directory-index` uses source roots derived from the canonical
  registry and requires directories containing production files to expose an
  index interface.
- `local/main-no-exports` separates executable entrypoints from import
  surfaces.
- `local/primary-export-name` aligns a single-purpose file with its primary
  export.
- `local/predicate-boolean-names` keeps boolean meaning explicit at call sites.
- `local/require-function-jsdoc` documents module-scope named functions.
- `local/no-classes-for-data` reserves classes for explicitly marked stateful
  resources and imperative adapters.

Inline ESLint configuration is disabled. Architectural exceptions belong in
reviewable repository config and docs, not file comments. `npm run lint` uses
`--max-warnings=0`, so size-budget warnings still fail verification.

## Test behavior

File and function size budgets are disabled for test files because setup and
fixtures often need a different shape. Other relevant source and boundary rules
remain active.

Boundary tests are scoped to declared source roots. Root-level tests for the
template's own tooling are linted as tooling rather than product source.

`eslint-boundaries.test.js` proves registry validation and both topology
translations, including public index access, unknown coverage, package-root
access, provider allow-lists, relative workspace bypasses, and production/test
direction.

The destination validator also accepts an empty monorepo registry for the
greenfield bootstrap state. Single-package repositories still require exactly
one workspace, and any production source introduced later remains subject to
strict unknown-file enforcement.

`eslint-local-rules.test.js` proves the reusable local rules, including source
root handling for monorepos and single-package repositories.

## Framework exceptions

Some frameworks require default exports or generated source shapes. Add the
narrowest file-specific ESLint exception and document the real framework
constraint in the destination repository. Do not weaken the repository-wide
default.

Generated or framework-owned first-level folders are not automatically
conceptual modules. If they must remain first-level, register and explain a
technical exception in the boundary registry.

## What ESLint does not prove

ESLint observes configured source files and dependency syntax it can parse and
resolve. It does not inherently prove runtime dependency injection, reflection,
network calls, data ownership, deployment relationships, non-code assets, or
package-manager constraints that are not represented by imports.

This limitation is intentional and explicit. The template ships no generic
standalone fitness checker. If a destination repository encounters a real rule
outside ESLint's observable model, document the gap and add one narrow,
well-tested enforcement mechanism for that rule. Do not build a speculative
second import graph.

## Maintenance rule

Keep these surfaces aligned in one change:

- `boundaries.config.mjs` for repository facts and permissions
- `eslint-boundaries/` for validation and translation semantics
- `eslint.config.mjs` and `eslint-local-rules/` for lint behavior
- the relevant architecture docs for terminology, rationale, or exceptions
- boundary and local-rule tests for executable proof

Run `npm run check` after every enforcement change.
