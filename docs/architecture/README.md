# Architecture Overview

This area defines reusable architecture philosophy and enforcement for both
monorepos and single-package repositories. It is product-agnostic: the template
defines how to make real concepts and dependencies explicit, but the destination
repository supplies those concepts.

Read [principles.md](principles.md) for the durable philosophy.

Read [module-organization.md](module-organization.md) when deciding repository
topology, workspace purpose, source layout, or module placement.

Read [boundaries.md](boundaries.md) when declaring workspaces, first-level
modules, composition files, or dependency permissions.

Read [javascript-conventions.md](javascript-conventions.md) when shaping
JavaScript or TypeScript files.

Read [eslint.md](eslint.md) when changing mechanical enforcement.

The intended model is:

- architecture docs explain principles, terms, decisions, and exceptions
- `boundaries.config.mjs` is the canonical executable dependency registry
- ESLint translates that registry into strict repository-wide checks and also
  enforces source-file conventions
- tests prove the registry validator, translator, and local ESLint rules
- destination repositories document product-specific and framework-specific
  decisions without weakening the reusable defaults

The template deliberately ships no standalone architecture-fitness checker.
ESLint is the default static enforcement surface because
`eslint-plugin-boundaries` already expresses the relevant import relationships.
That is not a claim that ESLint can observe every architecture concern. Add a
narrow additional check only after a destination repository identifies and
documents a concrete blind spot.
