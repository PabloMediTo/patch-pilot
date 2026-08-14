# Colocated Docs

[Co-located docs](../DICTIONARY.md#co-located-docs) are optional Markdown
files that live next to one concrete source or configuration file.

Naming convention:

- `src/foo.ts` -> `src/foo.docs.md`
- `src/bar/baz.ts` -> `src/bar/baz.docs.md`

Purpose:

- describe a public interface that matters beyond the code
- record non-obvious intent for why the file exists
- capture important invariants, constraints, or integration expectations

Rules:

- not every file needs co-located docs
- read a co-located docs file when it exists and is relevant to a task involving the documented file
- when the documented file is modified, update its co-located docs file if it exists and is affected
- do not create a new co-located docs file as part of normal maintenance
- new co-located docs are created manually and only when the user explicitly requests them
- co-located docs do not participate in the global `docs/_index.md` index system
