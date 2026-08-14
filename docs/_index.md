# Docs

This repository uses an indexed docs system.

## Areas

### Docs Overview
- Path: `docs/README.md`
- Summary: Human entrypoint for the repository docs tree, explaining what this documentation area is for and how to approach it.
- Read when: You need the mental model for the repository's documentation system rather than just the routing metadata.
- Tags: docs, overview, mental-model, entrypoint

### Docs Status
- Path: `docs/_status.md`
- Summary: Current state of the docs system, including what is already in place and which parts remain unsettled.
- Read when: You need the present state of the docs workflow, known gaps, or open questions.
- Tags: docs, status, current-state, gaps

### Docs Decisions
- Path: `docs/_decisions.md`
- Summary: Explains the key choices behind the current docs structure and why routing, mental-model, and status information are split across different files.
- Read when: You need rationale for the current docs model or want to understand why these file roles exist.
- Tags: docs, decisions, rationale, tradeoffs

### Dictionary
- Path: `docs/DICTIONARY.md`
- Summary: Canonical definitions for the repository terminology used by this repository's own `docs/` tree.
- Read when: The task depends on repository terminology, term consistency, ambiguous repository language, or docs changes that may introduce, rename, redefine, or remove important terms.
- Tags: docs, dictionary, terminology, glossary, repository-language

### Process
- Path: `docs/process/_index.md`
- Summary: Repository-wide conventions for docs routing, docs maintenance, and the split between global indexed docs and optional co-located docs.
- Read when: The task changes documentation workflow, repository instructions, docs indexing conventions, or how the agent should discover and maintain docs.
- Tags: docs, process, routing, maintenance, agent-workflow

### Architecture

- Path: `docs/architecture/_index.md`
- Summary: Conceptual source organization, explicit dependency boundaries, JavaScript and TypeScript conventions, and ESLint enforcement.
- Read when: A task affects repository topology, source layout, workspaces, modules, dependency direction, implementation conventions, or enforcement.
- Tags: architecture, modules, boundaries, eslint, topology
