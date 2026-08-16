# Repository Planning Context

## Responsibility

Select deterministic, bounded, non-sensitive repository text evidence for planning a reproduced issue.

## Not responsible for

- deciding an implementation plan or generating a source diff
- reading every repository file
- exposing secrets, binary files, dependencies, generated output, or symbolic-link targets
- retaining a local checkout or publishing full source content to the live timeline

## Inputs

- a fresh exact-revision repository workspace
- immutable bounded issue title and descriptive context
- the canonical repository-context safety policy

## Outputs

- a `ready` result with ordered repository-relative paths, UTF-8 content, and byte sizes
- at most 12 files, 32 KiB per file, and 128 KiB in aggregate
- the number of allowed candidates considered
- an explicit unsupported result when the 1,000-entry or 200-candidate discovery limit is exceeded or no readable context remains

## Adjacent parts

- [repository workspaces](repository-workspaces.md) provide and remove the exact-revision checkout
- [MVP safety policy](mvp-safety-policy.md) owns allowed text extensions, sensitive paths, excluded directories, and size limits
- [maintenance workflow](maintenance-workflow.md) invokes collection only after accepted reproduction
- [change proposals](change-proposals.md) pass the resulting evidence to plan and diff generators
- [run timelines](run-timelines.md) retain only selected paths and byte metrics, not full source content

## Discovery and ranking

Discovery streams at most 1,000 directory entries, processes each bounded directory batch in lexical order, and never follows symbolic links. It excludes Git metadata, dependencies, virtual environments, generated or distribution output, coverage output, environment files, private keys, lockfiles, unsupported extensions, binary content, and oversized files before selection. Sensitive name and extension checks are case-insensitive.

Allowed candidates receive deterministic scores. Repository instructions, readmes, and supported-project manifests have stable priority. Test paths and issue-token matches in paths or contents increase relevance. Ties use repository-relative lexical order. Selection then respects the file-count and aggregate-byte limits without truncating a file.

## Durable evidence boundary

The full selected text remains in the Activity result for later planning and therefore in Temporal workflow history. The Postgres/Redis timeline records only status, selected paths, per-file byte sizes, total bytes, and candidate count. This preserves an auditable selection without streaming repository source to every connected review client.
