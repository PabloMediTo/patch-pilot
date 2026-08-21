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
- immutable bounded issue title and descriptive context
- immutable base revision
- explicit expected-failure fragment
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
- [maintenance worker runtime](maintenance-worker-runtime.md) executes Temporal Activities
- repository workspace isolates untrusted project commands
- Postgres exposes durable audit and timeline data
- Redis distributes live progress
- web interface collects approval decisions
- GitHub delivery publishes only approved proposals

## Lifecycle

1. Record a `submitted` run through the atomic [run persistence](run-persistence.md) boundary, then start its deterministic Temporal [workflow submission](workflow-submission.md), bound to the repository, issue, and immutable base revision.
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

## Current implementation boundary

The executable workflow currently implements submission, inspection, and reproduction through step 5. It validates the persisted target, bounded issue title and context, and explicit expected-failure fragment; records replay-safe timeline events; and uses separate exact-revision disposable checkouts for inspection and reproduction so no machine-local path crosses an Activity boundary. Supported Python or TypeScript roots execute their standard test command through the canonical safe executor; unsupported roots record a reproduction skip.

Only a validated `reproduced` outcome starts [repository planning context](../DICTIONARY.md#repository-planning-context) collection in a third fresh exact-revision checkout. Ready context records `run.planning.ready` with paths and byte metrics while retaining full text only in the Activity result. A separate generator Activity then calls the worker-owned [proposal generator](../DICTIONARY.md#proposal-generator), passes its structured candidates through the provider-free change-proposal boundary, and records proposal lifecycle events without publishing the source diff. Safe proposals enter a 30-minute [proposal-attempt](../DICTIONARY.md#proposal-attempt) Activity in a fourth fresh checkout. Each attempt restores the immutable base, applies the complete diff, verifies through the safe executor, critiques passed evidence, and permits at most two full proposal revisions. Rejected, exhausted, and policy-blocked outcomes terminate explicitly. An accepted final attempt is recorded atomically as the canonical review snapshot; exact Activity retries reload the first writer while different evidence is rejected as a conflict. The workflow publishes the bounded review binding, records `run.approval.waiting`, and then suspends durably until a `reviewDecision` Temporal signal carries a valid persisted decision for the same run and exact binding. The API now sends that signal only after first-writer persistence succeeds or returns an exact replay. Mismatched or malformed signals do not release the wait. Approval records `run.approval.approved`; rejection records `run.approval.rejected` and an explicit terminal outcome. Unknown Activity or decision classifications fail the workflow instead of becoming product evidence. Pull-request delivery remains unimplemented, and live Docker enforcement still requires runtime proof.

## Retry policy

- The MVP permits at most two modify-test-critique retries.
- Infrastructure failures use bounded Activity retries with backoff.
- Deterministic validation, unsupported repository, and failed reproduction outcomes do not retry automatically.
- Each attempt remains visible in the timeline and keeps its evidence.

## Approval gate

Approval is valid only for the exact base revision, diff hash, plan version, and verification result shown to the reviewer. Any subsequent code change invalidates the prior approval and requires review again.

The implemented approval use case loads that binding from canonical run state rather than accepting it from the browser. It records the full base commit, source-diff hash, positive plan version, passed verification status, and verification-evidence hash with the first decision. A missing, malformed, or non-passing binding cannot be approved. Legacy decisions without this binding remain readable audit history but are not valid input for GitHub delivery.

The worker registers one `reviewDecision` signal handler before repository work begins so a valid early signal is not lost during replay. The handler retains at most one pending candidate before the review binding exists, ignores later malformed or mismatched candidates, and resolves only one immutable decision. The API follows the [workflow approval](workflow-approval.md) ordering contract: it signals only the persisted first-writer decision and does not acknowledge success before Temporal accepts it.

## Delivery gate

The implemented provider-free [GitHub delivery](github-delivery.md) use case recomputes the exact diff hash and compares every approval-binding field before invoking an external port. It derives one deterministic branch from the run identity, requires idempotent branch and draft-pull-request operations, links the issue, and persists delivery evidence through an atomic port. It never requests merge or a non-draft pull request.
