# Verification

## Responsibility

Execute the supported project's standard repository command for a ready [change proposal](../DICTIONARY.md#change-proposal), validate the bounded executor response, and produce immutable [verification evidence](../DICTIONARY.md#verification-evidence).

## Not responsible for

- providing the isolated command runtime
- deciding whether a passing change is well scoped or low risk
- retrying infrastructure failures
- persisting evidence or advancing workflow state

## Inputs

- a ready change proposal
- a supported project with workspace and standard command
- an isolated bounded-executor port

## Outputs

- exact command and ordered arguments
- exit code, stdout, stderr, duration, timeout, and truncation evidence
- a `passed`, `failed`, or `execution-failed` classification

## Adjacent parts

- safety gates the concrete sandbox executor
- critiques consume passing or failing evidence
- proposal attempts retain evidence for each attempt
- persistence will expose evidence to the review interface

## Classification

Exit code zero passes. A non-zero exit code is a correctable verification failure. Timeout or truncated output is an execution failure because the result cannot prove repository correctness. Malformed executor evidence is rejected at the boundary.
