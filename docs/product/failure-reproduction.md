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
- a concrete non-empty expected failure fragment derived from the issue
- an executor port that returns structured command evidence

## Outputs

- `reproduced` when the command fails and its output contains the expected fragment
- `not-reproduced` when the command succeeds
- `different-failure` when the command fails for another visible reason
- `execution-failed` when the bounded executor times out or truncates output
- immutable command, output, exit-code, duration, timeout, and truncation evidence

## Adjacent parts

- supported-project detection supplies the standard command
- the future safety executor owns process, container, network, and resource enforcement
- persistence will store the evidence in the run timeline
- planning starts only from a reproduced failure

## Evidence rule

A non-zero exit code alone is insufficient. The combined standard output and standard error must contain the exact expected failure fragment. Timeout or output truncation makes the execution evidence incomplete and therefore cannot produce an accepted reproduction.

The current implementation defines and tests the executor contract but does not execute untrusted target-repository commands on the host.
