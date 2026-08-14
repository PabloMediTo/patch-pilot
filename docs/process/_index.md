# Process

Process docs define how repository documentation is structured, routed, and maintained.

## Documents

### Process Overview
- Path: `docs/process/README.md`
- Summary: Human entrypoint for the documentation-process area, explaining what this area covers and how its documents fit together.
- Read when: You need the mental model for the repository's documentation workflow before going into detailed process rules.
- Tags: docs, process, overview, mental-model

### Process Status
- Path: `docs/process/_status.md`
- Summary: Current reality for the documentation-process area, including which workflow rules are active and where adoption is still incomplete.
- Read when: You need the present-state view of the docs process, known gaps, or active uncertainty.
- Tags: docs, process, status, current-state

### Process Decisions
- Path: `docs/process/_decisions.md`
- Summary: Rationale for separating routing, mental-model, status, and rationale docs in the process area.
- Read when: You need to understand why the docs process uses its current file roles and structural conventions.
- Tags: docs, process, decisions, rationale

### Conceptual Simplicity
- Path: `docs/process/conceptual-simplicity.md`
- Summary: Defines the repository's anti-complecting rules for code, terminology, docs structure, and system-part boundaries.
- Read when: The task affects architecture, module boundaries, terminology boundaries, system decomposition, or how docs should be structured to preserve conceptual simplicity.
- Tags: docs, process, simplicity, complexity, boundaries

### Docs Routing
- Path: `docs/process/docs-routing.md`
- Summary: Defines how global docs routing works, including using structured `_index.md` entries to decide which docs should be read for a task.
- Read when: The task changes doc discovery, routing behavior, index shape, or how the minimum sufficient set of global docs should be selected.
- Tags: docs, routing, indexing, read-when, discovery

### Docs System
- Path: `docs/process/docs-system.md`
- Summary: Defines the repository documentation model, including global indexed docs under `docs/`, optional co-located docs, and the maintenance expectations for both.
- Read when: The task changes the overall documentation system, ownership of docs files, index maintenance rules, or the relationship between global and co-located docs.
- Tags: docs, system, maintenance, global-docs, colocated-docs

### Dictionary
- Path: `docs/DICTIONARY.md`
- Summary: Defines the canonical repository terminology used by this repository's own docs tree and how terminology should stay consistent.
- Read when: The task depends on repository terminology, term consistency, ambiguous repository language, or docs changes that introduce, rename, redefine, or remove important terms.
- Tags: docs, dictionary, terminology, glossary, repository-language

### Colocated Docs
- Path: `docs/process/colocated-docs.md`
- Summary: Defines the naming convention, purpose, and conservative maintenance rules for optional `*.docs.md` files next to concrete source or configuration files.
- Read when: The task involves creating, reading, or updating co-located docs, or deciding whether file-specific documentation belongs next to code instead of in `docs/`.
- Tags: docs, colocated, module-docs, file-docs, maintenance

### Transitional Docs
- Path: `docs/process/transitional-docs.md`
- Summary: Explains how to work safely in repositories whose documentation structure is only partially normalized toward the indexed global docs model.
- Read when: The repository has legacy docs locations, missing docs indexes, or mixed documentation patterns that need to be interpreted or normalized.
- Tags: docs, transitional, legacy, migration, normalization
