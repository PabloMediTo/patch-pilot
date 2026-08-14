# Boundary Registry

`boundaries.config.mjs` is the canonical executable registry for repository
topology, production coverage, structural identities, and dependency
permissions. ESLint configuration is generated from it; do not maintain a
second edge map in docs or workspace-local files.

## Root fields

`topology` is `monorepo` or `single-package`.

`repositoryRole` is `application`, `library`, `tooling`, or `mixed`. It describes
the repository's purpose independently from topology.

`productionFiles` contains broad repository-relative globs for every location
where production JavaScript or TypeScript could appear. These globs define
enforcement coverage, not the list of approved modules. Keep them broad enough
that a new undeclared workspace or first-level folder is linted and rejected as
unknown.

`testFilePatterns` contains source-root-relative test patterns. The translator
scopes each pattern to every declared source root.

`testAllowedExternalDependencies` and `testAllowedCoreDependencies` are exact
test-only import specifiers available across declared source-root tests. Core
specifier entries use the `node:` form.

`workspaces` is keyed by stable short identifiers used by dependency edges.
There is exactly one entry with path `.` in a single-package repository. A
monorepo declares every package or application workspace that falls under the
production globs.

A greenfield monorepo may temporarily use an empty `workspaces` registry before
its first real application or package concept is known. This exception does not
permit unregistered production source: as soon as a workspace contains source
matched by `productionFiles`, it must be declared here.

## Workspace fields

Each workspace declares:

- `architectureRole`: `repository-root` for the sole single-package entry, or
  `application-shell`, `conceptual-package`, or
  `documented-technical-exception` in a monorepo
- `exceptionReason`: required only for a documented technical exception and
  tied to a concrete lifecycle, deployment, security, versioning, generation,
  or ownership constraint
- `isDeploymentUnit`: deployment status, kept separate from topology and role
- `path`: literal repository-relative workspace path
- `packageName`: exact package import root, including for private workspaces
- `sourceRoot`: literal path below the workspace where production code begins
- `allowedWorkspaceDependencies`: target workspace identifiers, never package
  names or globs
- `modules`: declared first-level source folders
- `compositionFiles`: individually declared source-root-relative composition
  files

Application shells must be deployment units. Conceptual packages are not
deployment units. A documented technical exception records deployment status
independently because either shape may be justified by the concrete constraint.

## Module fields

Each first-level module declares:

- `architectureRole`: `conceptual-module`, `application-role`, or
  `documented-technical-exception`
- `exceptionReason`: required only for a documented technical exception
- `allowedModuleDependencies`: target module names in the same workspace
- `allowedExternalDependencies`: exact third-party import specifiers
- `allowedCoreDependencies`: exact `node:` import specifiers

An application role cannot be placed in a conceptual package. Technical module
exceptions make brownfield or generated structure visible without calling it a
conceptual target.

Module names identify one literal first-level folder. Unknown targets,
self-dependencies, duplicate identities, and cycles are invalid.

## Composition fields

Each `compositionFiles` key is a literal path relative to its source root. Its
value contains the same three dependency arrays as a module:

- `allowedModuleDependencies`
- `allowedExternalDependencies`
- `allowedCoreDependencies`

Composition permissions do not modify module-to-module direction. A main file
can join two modules without granting those modules permission to depend on one
another.

## Enforced import semantics

Inside one module, implementation files may import other implementation files
but may not import their own parent index.

A declared cross-module edge permits only the target module's `index.*` file.
Deep implementation imports remain denied.

A declared cross-workspace edge permits only the target's exact `packageName`.
Package subpaths and relative traversal into another workspace remain denied.
Internal package names are rejected from external-provider allow-lists so they
cannot be disguised as third-party dependencies.

External and core dependencies default to denied. An exact specifier is allowed
only for the module, composition file, or test policy that lists it. If code
needs a provider subpath such as `react-dom/client`, list that exact subpath.
Wildcard provider permissions are invalid.

Production files cannot import files matched as tests. Tests may use module
internals in their own module and all same-workspace module public interfaces.
They inherit declared workspace package access and receive the explicit global
test external/core permissions.

## Validation and translation

`eslint-boundaries/validateBoundaryConfig.mjs` validates only the template's
compact registry schema and graph integrity.

`eslint-boundaries/createArchitectureBoundaryConfig.mjs` converts validated
entries into `eslint-plugin-boundaries` element descriptors, file descriptors,
and `boundaries/dependencies` policies. Import discovery, resolution, entity
matching, and policy evaluation remain plugin responsibilities.

The test suite exercises both topology examples and the important denial paths.
When the shorthand changes, update validator, translator, examples, tests, and
this document together.

## Maintenance discipline

Before adding an entry or permission, identify the current import or structural
need and its conceptual owner. Add the narrowest exact edge that supports it.

When removing or moving code, audit the importing owner and remove permissions
that no longer have a use. Do not retain an edge “just in case.”

Use [the single-package example](../../examples/single-package/boundaries.config.mjs)
or [the monorepo example](../../examples/monorepo/boundaries.config.mjs) as a
shape reference. Replace all illustrative concepts, package names, paths, and
providers with facts from the destination repository.
