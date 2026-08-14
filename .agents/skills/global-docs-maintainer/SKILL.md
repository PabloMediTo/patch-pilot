---
name: global-docs-maintainer
description: Maintain this repository's global indexed documentation system under docs/ by updating canonical docs and `_index.md` routing files as repository truth changes.
---

# Global Docs Maintainer

Use this skill whenever work changes global repository documentation or repository truth that should be reflected in `docs/`.

## Workflow

1. Update the global canonical document that owns the changed fact.
2. Ensure the affected docs folder still has a `README.md` that explains what the area is, why it exists, and the core mental model humans should use when reading the area.
3. Update or create the folder's `_status.md` when the change affects current reality, active uncertainty, known gaps, or open questions.
4. Update or create the folder's `_decisions.md` when the change affects important rationale or tradeoffs that would not be obvious from the current docs shape alone.
5. Preserve conceptual simplicity: do not broaden one doc to cover multiple distinct responsibilities just because they are adjacent in workflow or implementation.
6. When an area has multiple clear responsibility boundaries, prefer one focused doc per responsibility or system part plus a composition doc that describes how the parts fit together.
7. When a focused doc explicitly documents a system part, include the standard `Responsibility`, `Not responsible for`, `Inputs`, `Outputs`, and `Adjacent parts` sections unless the doc is clearly not a system-part doc.
8. Add a new focused global doc only when no current doc in `docs/` is a good fit.
9. Check the co-located `_index.md` first and update it if routing or discoverability changed.
10. Walk upward one folder at a time toward `docs/_index.md`, updating or creating routing `_index.md` files only where needed.
11. Stop once the next parent `_index.md` would not need any change.
12. Ensure every `_index.md` entry for an existing global doc includes `Path`, `Summary`, `Read when`, and `Tags`.
13. If the change introduces, removes, renames, or redefines important repository terms, also update `docs/DICTIONARY.md`.
14. After substantively changing docs in an area, do a dictionary coverage pass over the affected docs area. Add missing stable terms that now matter, link important uses, and remove stale links to removed entries.

## Boundaries

- Do not duplicate the same information across multiple global docs.
- Maintain routing integrity only through `_index.md` files in the `docs/` tree.
- Do not use `README.md` as a routing index in this repository. Keep it as the folder's human mental-model entrypoint.
- Do not use this skill for co-located `*.docs.md` files next to source files.
- Do not preserve stale wording when the correct scope is now known.
- Do not let implementation convenience or process adjacency justify a doc boundary that braids distinct responsibilities together.
- Do not treat dictionary maintenance as complete just because the explicitly mentioned terms were handled.

## Canonical References

Read [docs/_index.md](../../../docs/_index.md) for the root global docs index.
Read [docs/DICTIONARY.md](../../../docs/DICTIONARY.md) when terminology changes are part of the task.
Read [docs/process/_index.md](../../../docs/process/_index.md) for process docs routing.
Read [docs/process/docs-system.md](../../../docs/process/docs-system.md) for the indexed global docs model.
Read [docs/process/colocated-docs.md](../../../docs/process/colocated-docs.md) to distinguish co-located docs from global docs.
