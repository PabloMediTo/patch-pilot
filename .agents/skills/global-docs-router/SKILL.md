---
name: global-docs-router
description: Route into this repository's global indexed documentation system under docs/ and load only the smallest sufficient set of global docs for the current task.
---

# Global Docs Router

Use this skill for every substantive prompt before implementation work starts.

## Workflow

1. Decide whether global repository docs are needed for the task.
2. If no global docs are needed, stop after making that decision explicit in your reasoning.
3. If global docs are needed, read `docs/_index.md` first.
4. Use each structured `_index.md` entry's `Read when`, `Summary`, and `Tags` fields to identify the smallest relevant global docs area for the task.
5. Read that area's `_index.md` before opening documents inside the area.
6. Treat `_index.md` as navigation, `README.md` as the human mental-model entrypoint, `_status.md` as present-state context, `_decisions.md` as rationale, and ordinary topic docs as focused mechanisms or rules.
7. Read the area's `README.md` when you need to understand what the area is, why it exists, or how its docs are meant to be interpreted.
8. Read the area's `_status.md` when current reality, active uncertainty, known gaps, or open questions matter to the task.
9. Read the area's `_decisions.md` when rationale, tradeoffs, or historical intent matter to the task.
10. Read only the minimum sufficient set of topic docs after the relevant higher-level area docs are loaded.
11. Read `docs/process/conceptual-simplicity.md` when the task affects architecture, implementation boundaries, system decomposition, terminology boundaries, or docs structure.
12. Read `docs/DICTIONARY.md` when the task depends on repository terminology, terminology consistency, or docs prose that may introduce or redefine important terms.
13. If you notice a meaningful contradiction or mismatch while routing or reading global docs, surface it clearly even if the user did not explicitly ask for contradiction-finding.
14. If global docs and code disagree, trust the code and note the mismatch.

## Boundaries

- Do not read the entire `docs/` tree by default.
- Do not treat this skill as a reason to spawn a subagent automatically.
- Do not use this skill to discover co-located `*.docs.md` files.
- Prefer the `Read when` field as the primary routing hint, with `Summary` and `Tags` as supporting signals.
- Do not treat `README.md` as a routing index. In this repository it is the human entrypoint for the folder.
- When a task depends on how the repository should decompose concepts, modules, or system parts, include the conceptual-simplicity rules rather than inferring structure ad hoc.
- When surfacing an incidental contradiction, identify the conflicting files and keep the contradiction note separate from the main answer.
- Use explicit file references when summarizing findings.

## Canonical References

Read [docs/_index.md](../../../docs/_index.md) for the root global docs index.
Read [docs/DICTIONARY.md](../../../docs/DICTIONARY.md) when repository terminology matters to the task.
Read [docs/process/_index.md](../../../docs/process/_index.md) for process docs routing.
Read [docs/process/conceptual-simplicity.md](../../../docs/process/conceptual-simplicity.md) when the task depends on conceptual boundaries, module responsibilities, or anti-complecting rules.
Read [docs/process/docs-routing.md](../../../docs/process/docs-routing.md) when the repository follows the indexed global docs system.
Read [docs/process/transitional-docs.md](../../../docs/process/transitional-docs.md) when the global docs tree is only partially normalized.
