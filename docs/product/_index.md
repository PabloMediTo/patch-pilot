# Product

## Documents

### Product Overview

- Path: `docs/product/README.md`
- Summary: Human mental model for the Autonomous GitHub Maintainer and its controlled-maintenance stance.
- Read when: You need orientation to the product before reading focused behavior or system documents.
- Tags: product, overview, maintainer

### Product Status

- Path: `docs/product/_status.md`
- Summary: Current implementation reality, active product gaps, and immediate next milestone.
- Read when: You need to know what exists now versus what is only planned.
- Tags: product, status, current-state, gaps

### Product Decisions

- Path: `docs/product/_decisions.md`
- Summary: Rationale for the initial control plane, workflow, persistence, safety, and delivery choices.
- Read when: You need the reasons behind the proposed product shape or MVP tradeoffs.
- Tags: product, decisions, rationale, tradeoffs

### Product Vision

- Path: `docs/product/product-vision.md`
- Summary: User problem, promised outcome, users, success criteria, and non-goals.
- Read when: A task changes the product promise, target user, outcome, or success definition.
- Tags: product, vision, users, outcome

### Maintenance Workflow

- Path: `docs/product/maintenance-workflow.md`
- Summary: Durable issue-to-proposal lifecycle, retry behavior, evidence gates, and human approval.
- Read when: A task changes run states, agent steps, retries, approval, or delivery behavior.
- Tags: product, workflow, temporal, retry, approval

### Run Persistence

- Path: `docs/product/run-persistence.md`
- Summary: Canonical submitted-run identity, Postgres first-writer persistence, and webhook-redelivery conflict recovery.
- Read when: A task changes initial run validation, run storage, submission idempotency, or the persistence boundary before Temporal starts.
- Tags: product, runs, postgres, persistence, idempotency, temporal

### Workflow Submission

- Path: `docs/product/workflow-submission.md`
- Summary: Deterministic Temporal workflow identity, persistence-before-dispatch ordering, redelivery idempotency, and API connection lifecycle.
- Read when: A task changes how persisted runs start Temporal workflows, workflow IDs, task queues, dispatch retries, or Temporal client ownership.
- Tags: product, runs, temporal, workflow, submission, idempotency

### Maintenance Worker Runtime

- Path: `docs/product/maintenance-worker-runtime.md`
- Summary: Temporal worker registration, first inspection workflow phase, Activity retry boundaries, and provider lifecycle.
- Read when: A task changes worker startup, workflow registration, Activity composition, inspection orchestration, task queues, or worker shutdown.
- Tags: product, worker, temporal, workflow, activities, inspection, lifecycle

### System Composition

- Path: `docs/product/system-composition.md`
- Summary: Responsibilities and relationships of the control plane, worker, web interface, persistence, cache, and isolated repository workspace.
- Read when: A task changes system responsibilities, application boundaries, storage ownership, or runtime integration.
- Tags: product, system, components, postgres, redis, temporal

### MVP Scope

- Path: `docs/product/mvp-scope.md`
- Summary: Supported repositories and bugfixes, safety limits, acceptance criteria, and excluded capabilities.
- Read when: A task proposes functionality for the first releasable product or changes its limits.
- Tags: product, mvp, scope, safety, python, typescript

### Local Development Environment

- Path: `docs/product/local-development.md`
- Summary: Pinned Docker Compose services, endpoints, health model, and commands for local Temporal, Postgres, and Redis development.
- Read when: You need to start, inspect, troubleshoot, or update the local stateful service environment.
- Tags: product, local-development, docker, temporal, postgres, redis

### Control-Plane Authentication

- Path: `docs/product/control-plane-authentication.md`
- Summary: Single-operator bearer authentication, environment contract, timing-safe credential comparison, and explicit MVP authorization limits.
- Read when: A task changes control-plane user authentication, bearer credentials, actor identity, run access, or API deployment security.
- Tags: product, api, authentication, authorization, bearer, security

### Control-Plane Runtime

- Path: `docs/product/control-plane-runtime.md`
- Summary: Executable API composition, environment contract, shared Postgres/Redis resources, listener startup, and deterministic shutdown.
- Read when: A task changes API startup, environment values, provider lifecycle, listener behavior, or deployment shutdown.
- Tags: product, api, runtime, postgres, redis, lifecycle, deployment

### GitHub Run Ingestion

- Path: `docs/product/github-ingestion.md`
- Summary: Signed GitHub App webhook authentication, explicit issue opt-in, immutable revision resolution, and run-submission output.
- Read when: A task changes GitHub webhook handling, issue triggers, delivery identity, signature verification, or initial run submission.
- Tags: product, github, webhook, ingestion, runs, security

### GitHub Delivery

- Path: `docs/product/github-delivery.md`
- Summary: Exact approval-evidence gate, deterministic branch naming, draft-pull-request publication, and idempotent retry semantics.
- Read when: A task changes approved branch publication, pull-request creation, delivery evidence, or GitHub delivery retries.
- Tags: product, github, delivery, approval, pull-request, idempotency

### GitHub Delivery Reconciliation

- Path: `docs/product/github-delivery-reconciliation.md`
- Summary: Idempotent pull-request webhook comparison, immutable provider drift, and delivery observations.
- Read when: A task changes post-publication GitHub webhooks, pull-request lifecycle observation, provider drift, or webhook replay handling.
- Tags: product, github, delivery, reconciliation, webhook, pull-request, idempotency

### Repository Workspaces

- Path: `docs/product/repository-workspaces.md`
- Summary: Disposable checkout creation, exact revision verification, credential removal, cleanup, and the boundary with later command isolation.
- Read when: A task changes repository checkout, immutable revision handling, workspace paths, Git process limits, or cleanup safety.
- Tags: product, repository, workspace, git, checkout, isolation, security

### Supported Project Detection

- Path: `docs/product/project-detection.md`
- Summary: Deterministic Python/TypeScript recognition, standard test-command selection, and explicit unsupported or ambiguous outcomes.
- Read when: A task changes supported repository shapes, manifest detection, language selection, or standard reproduction commands.
- Tags: product, detection, python, typescript, pytest, npm

### Failure Reproduction

- Path: `docs/product/failure-reproduction.md`
- Summary: Bounded-executor contract, expected-failure matching, evidence fields, and reproduction outcomes.
- Read when: A task changes reproduction commands, failure matching, command evidence, timeout handling, or reproduction outcomes.
- Tags: product, reproduction, evidence, tests, executor, failure

### MVP Safety Policy

- Path: `docs/product/mvp-safety-policy.md`
- Summary: Exact command allow-list, workspace containment, resource specification, change-size limits, sensitive paths, and the concrete sandbox boundary.
- Read when: A task changes command execution, sandbox limits, network policy, output limits, diff size, forbidden paths, or safety exceptions.
- Tags: product, safety, sandbox, execution, limits, diff, policy

### Change Proposals

- Path: `docs/product/change-proposals.md`
- Summary: Structured plan generation, unified-diff evidence, plan-to-diff matching, and canonical safety assessment.
- Read when: A task changes implementation planning, generated source diffs, proposal generator ports, diff parsing, or plan-to-file traceability.
- Tags: product, proposal, plan, diff, generation, traceability, safety

### Verification

- Path: `docs/product/verification.md`
- Summary: Standard project-command execution, immutable command evidence, and passed, failed, or infrastructure-failed classification.
- Read when: A task changes proposal verification commands, executor evidence, timeout handling, output truncation, or verification outcomes.
- Tags: product, verification, tests, evidence, command, sandbox

### Critiques

- Path: `docs/product/critiques.md`
- Summary: Deterministic verification gates, structured reviewer findings, and accepted, retry, or rejected decisions.
- Read when: A task changes proposal critique inputs, findings, blocking rules, retry eligibility, or rejection behavior.
- Tags: product, critique, review, findings, retry, evidence

### Proposal Attempts

- Path: `docs/product/proposal-attempts.md`
- Summary: Apply-verify-critique composition, immutable attempt history, plan-version advancement, and the two-retry budget.
- Read when: A task changes modification attempts, retry orchestration, attempt history, exhaustion, or proposal revision contracts.
- Tags: product, proposal, attempts, retry, verification, critique, versions

### Run Timelines

- Path: `docs/product/run-timelines.md`
- Summary: Canonical Postgres event ordering, Redis live fan-out, adapter lifecycle, and persistence-before-publication failure semantics.
- Read when: A task changes timeline event data, Postgres persistence, Redis channels, live progress, event ordering, or stream recovery.
- Tags: product, timeline, events, postgres, redis, streaming, persistence

### Review Screen

- Path: `docs/product/review-screen.md`
- Summary: Human review model and safe rendering of timeline, plan, diff, verification evidence, and approval actions.
- Read when: A task changes review evidence presentation, diff rendering, approval availability, or web review behavior.
- Tags: product, review, frontend, diff, evidence, approval

### Review Snapshots

- Path: `docs/product/review-snapshots.md`
- Summary: Immutable approval-gate evidence, exact review binding, atomic Postgres persistence, and separation from timeline and decisions.
- Read when: A task changes when evidence enters human review, review persistence, approval bindings, or API review-query composition.
- Tags: product, review, snapshot, postgres, evidence, approval
