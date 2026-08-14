# Architecture

Architecture docs define product-agnostic source organization, dependency
boundaries, implementation conventions, and mechanical enforcement.

## Documents

### Architecture Overview

- Path: `docs/architecture/README.md`
- Summary: Mental model for the architecture layer and the relationship between
  docs, the canonical boundary registry, ESLint, and tests.
- Read when: You need orientation before reading focused architecture rules.
- Tags: architecture, overview, mental-model

### Architecture Status

- Path: `docs/architecture/_status.md`
- Summary: Current enforced baseline and repository-specific adaptation points.
- Read when: You need the present-state architecture model or adoption status.
- Tags: architecture, status, baseline, adaptation

### Architecture Decisions

- Path: `docs/architecture/_decisions.md`
- Summary: Rationale for conceptual boundaries, topology handling, one
  executable registry, and ESLint-based enforcement.
- Read when: You need to understand why the architecture model has this shape.
- Tags: architecture, decisions, rationale

### Architecture Principles

- Path: `docs/architecture/principles.md`
- Summary: Principles for conceptual simplicity, explicit composition, late
  extraction, real-constraint-first optimization, and machine-legible code.
- Read when: The task changes architecture philosophy or responsibility
  boundaries.
- Tags: architecture, principles, simplicity, boundaries

### Module Organization

- Path: `docs/architecture/module-organization.md`
- Summary: Rules for monorepo and single-package layouts, conceptual
  workspaces, first-level modules, vertical slices, interfaces, composition,
  technical exceptions, and tests.
- Read when: The task affects repository topology, source layout, workspaces,
  module placement, public interfaces, shared code, or test placement.
- Tags: architecture, modules, source-layout, topology, concepts

### Boundary Registry

- Path: `docs/architecture/boundaries.md`
- Summary: Canonical registry schema and rules for workspace, module,
  composition, external, core, and test dependencies.
- Read when: The task changes `boundaries.config.mjs`, dependency permissions,
  workspace or module graphs, source roots, or technical exceptions.
- Tags: architecture, boundaries, dependencies, registry

### JavaScript And TypeScript Conventions

- Path: `docs/architecture/javascript-conventions.md`
- Summary: Conventions for data modeling, class exceptions, filename/export
  alignment, instruction-shaped functions, boolean names, JSDoc, and exports.
- Read when: The task affects JavaScript or TypeScript source shape.
- Tags: architecture, javascript, typescript, naming, jsdoc

### ESLint Enforcement

- Path: `docs/architecture/eslint.md`
- Summary: ESLint boundary translation, strict coverage, local rules,
  resolution, tests, limits, and exception policy.
- Read when: The task changes ESLint, the boundary translator or validator,
  local rules, resolvers, import forms, or lint exceptions.
- Tags: architecture, eslint, lint, enforcement
