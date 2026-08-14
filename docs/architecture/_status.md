# Architecture Status

## Current baseline

- This repository is configured as a greenfield monorepo using npm workspaces.
- Potential workspace locations are `apps/*` and `packages/*`.
- No application, package, deployment unit, source root, conceptual module, or dependency permission is registered yet.
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

When the first real workspace is introduced, this repository must decide explicitly:

- whether the repository as a whole is an application, library, tool, or a
  mixed monorepo
- which workspaces are deployment units
- where each workspace's production source root begins
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
