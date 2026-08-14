---
name: colocated-docs-reader
description: Discover and read an adjacent *.docs.md file for a concrete source or configuration file when such a co-located doc exists and is relevant.
---

# Colocated Docs Reader

Use this skill whenever you open a concrete source or configuration file and need to check whether there is relevant co-located documentation.

## Workflow

1. For the current file, derive the co-located docs path by replacing the file extension with `.docs.md`.
2. Check whether that co-located docs file exists.
3. If it exists and is relevant to the current task, read it.
4. If it does not exist, continue without treating that as a gap.
5. If the co-located docs and code disagree, trust the code and note the mismatch.

## Boundaries

- Do not create a co-located docs file.
- Do not scan unrelated directories for other `*.docs.md` files.
- Do not use this skill as a substitute for global docs routing in `docs/`.

## Canonical References

Read [docs/process/colocated-docs.md](../../../docs/process/colocated-docs.md) for the co-located docs convention.
