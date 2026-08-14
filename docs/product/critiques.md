# Critiques

## Responsibility

Turn proposal and [verification evidence](../DICTIONARY.md#verification-evidence) into an immutable [critique decision](../DICTIONARY.md#critique-decision) with structured findings.

## Not responsible for

- executing repository checks
- revising the implementation plan or diff
- counting or scheduling retries
- choosing a particular model provider

## Inputs

- ready change proposal and canonical safety decision
- verification outcome and evidence
- structured reviewer port for proposals that pass verification

## Outputs

- `accepted`, `retry`, or `rejected` decision
- stable deterministic reason when verification gates the outcome
- reviewer rationale and warning or blocking findings

## Adjacent parts

- verification supplies command evidence
- proposal attempts act on the critique decision
- revision produces the next plan version after a retry decision
- the review interface will display findings and rationale

## Decision rules

Failed tests request a correctable modification retry without calling the reviewer. Timeout or truncated output rejects the attempt as an infrastructure outcome; workflow Activity retries remain a future orchestration concern.

Passing verification reaches the reviewer port for scope, diff, safety, and regression-risk assessment. Reviewer output must be structured. An accepted result cannot contain a blocking finding.
