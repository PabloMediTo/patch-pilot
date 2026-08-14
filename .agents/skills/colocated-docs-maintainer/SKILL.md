---
name: colocated-docs-maintainer
description: Update an existing adjacent *.docs.md file when changes to a concrete source or configuration file affect what that co-located doc says.
---

# Colocated Docs Maintainer

Use this skill whenever you modify a concrete source or configuration file.

## Workflow

1. Derive the co-located docs path by replacing the file extension with `.docs.md`.
2. Check whether that co-located docs file exists.
3. If it exists and the source change affects documented behavior, interface, intent, invariants, or constraints, update it in the same task.
4. If it does not exist, stop and do not create a new co-located docs file unless the user explicitly requests one.
5. If the co-located docs and code disagree, correct the doc to match the code.

## Boundaries

- Do not create new co-located docs files unless explicitly requested.
- Do not update unrelated `*.docs.md` files.
- Do not use this skill for global docs under `docs/`.

## Canonical References

Read [docs/process/colocated-docs.md](../../../docs/process/colocated-docs.md) for the co-located docs convention.
