---
name: business-dictionary-maintainer
description: Maintain `docs/DICTIONARY.md` as the canonical repository terminology dictionary for this repository's docs by adding, updating, linking, and removing repository-concept and meta/internal term definitions.
---

# Business Dictionary Maintainer

Use this skill whenever repository docs or instructions introduce, rename,
redefine, or remove repository terminology that matters to understanding the
repository.

## Workflow

1. Read `docs/DICTIONARY.md`.
2. Identify which repository concepts or meta/internal terms were introduced,
   changed, or removed by the current task.
3. When the task substantively changes docs in an area, do a coverage pass over
   the affected docs area instead of stopping at the explicitly requested terms.
4. Add, update, merge, or remove dictionary entries so `docs/DICTIONARY.md`
   remains the single canonical source for those terms.
5. Keep entries sorted alphabetically within their section.
6. Put a term in `Repository Concepts` when it names an actual thing, artifact,
   part, state, workflow, property, or relation intrinsic to the repository's
   documented domain model.
7. Put a term in `Meta And Internal Terms` when it names how the repository
   classifies, scopes, designs, implements, operates, or documents repository
   concepts.
8. Do not add vague principle language, taste labels, or one-off grouping
   labels to the dictionary unless they are stable reference terms used
   repeatedly across docs and need canonical meaning.
9. If a term only labels a category of concepts rather than a concept the
   repository actually has, prefer documenting the actual concepts instead of
   adding the category label as a dictionary entry.
10. When a term is easy to misunderstand, easy to misuse, or overloaded in
    everyday language, include a short usage example. Prefer a concrete command
    example when usage depends on a command.
11. If an entry describes a planned concept rather than a live implemented one,
    say that explicitly.
12. Prefer one important term per concept. Do not let near-synonyms blur
    distinct responsibility boundaries or fold multiple concepts into one
    overloaded term.
13. When editing prose under `docs/`, link important dictionary terms to their
    matching dictionary entries unless the term is being used as code, CLI
    syntax, or a file path in backticks.
14. Remove dictionary entries when the term is removed from the product or
    repository model entirely, and remove stale links to removed entries from
    the affected docs.

## Boundaries

- Use this skill for important repository terminology, not for general English
  words.
- Do not let `docs/DICTIONARY.md` accumulate near-synonyms for the same concept without clarifying the preferred term.
- Do not mix repository concepts and meta/internal terminology into one flat
  glossary section.
- Do not promote principle headings, taste labels, or simple inventory labels
  into dictionary entries when they are not stable repository terms.
- Do not use one dictionary entry to hide multiple distinct concepts behind a
  single overloaded label.
- Do not restate code-level implementation details that belong in topic docs or co-located docs.
- Do not stop after updating only the terms mentioned explicitly when the
  surrounding docs now rely on additional stable terms that also meet the
  criteria.
- Keep examples short and practical.

## Canonical References

Read [docs/DICTIONARY.md](../../../docs/DICTIONARY.md) for the canonical term definitions.
Read [docs/_index.md](../../../docs/_index.md) for root docs routing.
Read [docs/process/conceptual-simplicity.md](../../../docs/process/conceptual-simplicity.md) when terminology needs to preserve clear conceptual boundaries.
Read [docs/process/docs-system.md](../../../docs/process/docs-system.md) for the repository docs model.
