# Failure Reproduction

## Responsibility

Execute a supported project's standard test command through a bounded executor and determine whether its evidence matches the failure reported by the issue.

## Not responsible for

- providing the command sandbox or resource limits
- installing dependencies
- treating every non-zero exit as the reported bug
- modifying repository files

## Inputs

- a supported-project descriptor
- the persisted non-empty [expected failure fragment](../DICTIONARY.md#expected-failure-fragment) explicitly marked in the issue
- an executor port that returns structured command evidence

## Outputs

- `reproduced` when the command fails and its output contains the expected fragment
- `not-reproduced` when the command succeeds
- `different-failure` when the command fails for another visible reason
- `execution-failed` when the bounded executor times out or truncates output
- immutable command, output, exit-code, duration, timeout, and truncation evidence

## Adjacent parts

- supported-project detection supplies the standard command
- the worker's safety executor owns process, container, network, and resource enforcement
- the maintenance workflow records reproduction lifecycle and result evidence in the run timeline
- planning starts only from a reproduced failure

## Evidence rule

A non-zero exit code alone is insufficient. The combined standard output and standard error must contain the exact expected failure fragment. Timeout or output truncation makes the execution evidence incomplete and therefore cannot produce an accepted reproduction.

The Temporal workflow now creates a fresh exact-revision workspace for reproduction, re-detects the project, executes its standard test command through the composed safety executor, records the classified evidence, and removes the workspace in `finally`. Unsupported inspection results record an explicit skipped outcome and never invoke reproduction. Only `reproduced` becomes planning-ready; every other known classification becomes a visible terminal workflow outcome, and an unknown classification fails the workflow boundary. A real Docker execution remains unverified locally, so deployed untrusted execution stays disabled until the runtime safety proof is complete.
