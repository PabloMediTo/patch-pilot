# Maintenance Workflow

## Responsibility

Own one durable maintenance run from validated repository and issue input through an approved pull-request proposal or an explicit terminal outcome.

## Not responsible for

- deciding whether a pull request is merged
- deploying the target repository
- hiding failed attempts or unverifiable results
- providing the isolated runtime, persistence engine, or user interface

## Inputs

- GitHub repository installation and repository identifier
- issue identifier
- immutable base revision
- actor and authorization context
- configured run limits and target-language policy

## Outputs

- ordered run steps and attempts
- reproduction result
- implementation plan
- source diff
- verification evidence
- critique and retry decisions
- approval decision
- pull-request proposal or explicit failure/rejection outcome

## Adjacent parts

- control-plane API starts and queries runs
- worker executes Temporal activities
- repository workspace isolates untrusted project commands
- Postgres exposes durable audit and timeline data
- Redis distributes live progress
- web interface collects approval decisions
- GitHub delivery publishes only approved proposals

## Lifecycle

1. Record a `submitted` run bound to the repository, issue, and immutable base revision.
2. Validate repository, issue, installation, language, and base revision.
3. Create the isolated repository workspace.
4. Inspect manifests, instructions, source layout, and relevant history.
5. Reproduce the issue with a recorded command and failing evidence.
6. Produce a bounded implementation plan.
7. Modify only the files justified by the plan.
8. Run focused and repository-level verification.
9. Critique the diff, evidence, scope, and regression risk.
10. Retry modification and verification when the critique identifies a correctable problem and the retry budget remains.
11. Wait durably for human approval or rejection.
12. After approval, prepare and publish the branch and pull-request proposal idempotently.

## Retry policy

- The MVP permits at most two modify-test-critique retries.
- Infrastructure failures use bounded Activity retries with backoff.
- Deterministic validation, unsupported repository, and failed reproduction outcomes do not retry automatically.
- Each attempt remains visible in the timeline and keeps its evidence.

## Approval gate

Approval is valid only for the exact base revision, diff hash, plan version, and verification result shown to the reviewer. Any subsequent code change invalidates the prior approval and requires review again.

The implemented approval use case loads that binding from canonical run state rather than accepting it from the browser. It records the full base commit, source-diff hash, positive plan version, passed verification status, and verification-evidence hash with the first decision. A missing, malformed, or non-passing binding cannot be approved. Legacy decisions without this binding remain readable audit history but are not valid input for GitHub delivery.

## Delivery gate

The implemented provider-free [GitHub delivery](github-delivery.md) use case recomputes the exact diff hash and compares every approval-binding field before invoking an external port. It derives one deterministic branch from the run identity, requires idempotent branch and draft-pull-request operations, links the issue, and persists delivery evidence through an atomic port. It never requests merge or a non-draft pull request.
