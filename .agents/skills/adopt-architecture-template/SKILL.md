---
name: adopt-architecture-template
description: Adopt this architecture philosophy and ESLint boundary template in a JavaScript or TypeScript repository. Use when installing or reapplying the template, selecting its monorepo or single-package shape, replacing an older fitness-checker version, or planning strict boundary coverage for an existing codebase.
---

# Adopt Architecture Template

Adopt the template from repository evidence without inventing product concepts
or forcing a monorepo layout.

## Inspect before changing files

1. Read the target repository's `AGENTS.md` files and documentation index.
2. Inspect package-manager workspace declarations, package manifests, build and
   publish graphs, executable units, source roots, aliases, and existing lint
   configuration.
3. Read product and architecture docs that identify current concepts and
   ownership. Use imports and change locality as supporting evidence.
4. Record four separate findings:
   - repository topology: `monorepo` or `single-package`
   - repository role: application, library, tooling, or mixed
   - deployment units
   - adoption mode: greenfield or migration

Multiple folders or deployments do not by themselves prove a monorepo. Multiple
declared package/application workspaces do. If the evidence does not clearly
select one topology, pause and ask the user before modifying the target.

## Identify structural concepts

For a monorepo:

- treat deployable applications as thin `application-shell` workspaces
- treat package workspaces as `conceptual-package` boundaries
- use `documented-technical-exception` only for a current independent lifecycle,
  deployment, security, versioning, generation, or ownership constraint

For either topology, first-level source folders are `conceptual-module` or, in
an application, a coherent `application-role`. Do not infer concepts from
technical names such as `services`, `controllers`, `database`, `api`, `utils`,
or framework names.

In an existing repository, register an unavoidable technical workspace or
module as a documented exception with its concrete reason. This preserves strict
coverage without pretending the legacy structure is the target architecture.

## Plan the adaptation

Read these template documents before editing:

- `../../../docs/architecture/module-organization.md`
- `../../../docs/architecture/boundaries.md`
- `../../../docs/architecture/eslint.md`

Choose the matching registry example:

- `../../../examples/monorepo/boundaries.config.mjs`
- `../../../examples/single-package/boundaries.config.mjs`

Prepare a file-level plan that merges with existing docs, ESLint, scripts, and
agent instructions. Do not overwrite unrelated target rules.

## Install and adapt

1. Ensure the docs-driven development template is already present.
2. Copy or merge `docs/architecture/`, the architecture `AGENTS.md` rules,
   `eslint-boundaries/`, `eslint-local-rules/`, both test suites, and the adoption
   and maintenance skills.
3. Create the target's `boundaries.config.mjs` from the selected example.
4. Set broad `productionFiles` globs that cover every possible production
   source location, including locations for undeclared workspaces or modules.
5. Replace every illustrative workspace, package, source root, module,
   composition file, and dependency with a target fact.
6. Derive dependency edges from current imports and intended direction. Use
   exact internal package roots, external specifiers, and `node:` core
   specifiers. Do not add wildcard or speculative permissions.
7. Merge `eslint.config.mjs`, package scripts, and compatible dependencies.
   Preserve target resolvers and add any real alias resolution the boundary
   plugin needs.
8. Add the architecture area to `docs/_index.md` and record target-specific
   concepts, exceptions, and migration intent in its architecture docs.
9. Remove an older standalone architecture-fitness checker, its config, scripts,
   package command, docs, and agent references after its covered rules are
   represented by the new registry and ESLint tests.

Do not add a replacement generic checker. If inspection finds a concrete rule
that ESLint cannot observe, document that gap and propose the narrowest separate
mechanism rather than expanding scope silently.

## Verify adoption

Run the target's formatter if it has one, then lint, the two template test
suites, and the repository's broader checks. Confirm at minimum that:

- both registry topology examples still validate
- every current production source file is a declared module, composition file,
  or test, or is an explicit documented migration exception
- an invented workspace and first-level module fail as unknown
- deep cross-module, package-subpath, and relative cross-workspace imports fail
- arbitrary external and core dependencies fail
- required public interfaces and framework exceptions still work
- no old fitness-checker surface or duplicate boundary map remains

Report the selected topology, the evidence for it, conceptual boundaries,
documented exceptions, enforcement coverage, commands run, and any real ESLint
blind spot that remains.
