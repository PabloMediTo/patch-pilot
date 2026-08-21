# Dictionary

This file is the canonical dictionary for the repository terminology used by
this repository's own `docs/` tree.

It has two sections on purpose:

- `Repository Concepts` is for actual things, parts, artifacts, states,
  workflows, properties, and relations that belong to the repository's
  documented domain model itself.
- `Meta And Internal Terms` is for terms the repository uses to scope, design,
  implement, operate, or document those concepts.

Use it to keep terminology understandable, consistent, and linkable from
anywhere in `docs/`.

## Maintenance Rules

- Keep entries sorted alphabetically within their section.
- Put a term in `Repository Concepts` when it names an actual thing, artifact,
  part, state, workflow, property, or relation intrinsic to the repository's
  documented domain model.
- Put a term in `Meta And Internal Terms` when it names how the repository
  classifies, scopes, designs, implements, operates, or documents repository
  concepts.
- Do not add vague principle language, taste labels, or one-off grouping labels
  to the dictionary unless they are stable reference terms used repeatedly
  across docs and need canonical meaning.
- If a term only labels a category of concepts rather than a concept the
  repository actually has, prefer documenting the actual concepts instead of
  adding the category label as a dictionary entry.
- Add or update entries when the project's terminology changes, when a term
  gains a new meaning, or when a newly introduced term becomes important to
  understanding the repository.
- After substantively changing docs in an area, do a dictionary coverage pass
  over the affected docs. Scan for stable terms the updated docs now rely on,
  add missing entries for terms that meet the criteria, link important uses,
  and remove stale links to removed entries.
- Remove entries when the term is removed from the product or repository model
  entirely.
- Write entries for readers with little domain knowledge. An entry should
  explain what the term is, why it exists in this model, and how it relates to
  surrounding terms.
- If a term is easy to misunderstand, easy to misuse, or can mean more than one
  thing in everyday language, include a short usage example that shows how a
  tool consumer would actually use it in a managed project. If using the term
  depends on a command, prefer a concrete example command and explain what that
  enables.
- If an entry describes a planned concept rather than a live implemented one,
  say that explicitly so the dictionary does not blur target behavior with
  current behavior.
- In `docs/` prose, link repository terms to the matching entry in this
  dictionary unless the term is being used as code, CLI syntax, or a file path
  in backticks.

## Repository Concepts

### Application Workspace

A deployable monorepo workspace that acts as a thin composition shell. It owns startup, environment and framework integration, while product behavior remains in conceptual modules or packages.

### Approval Decision

The recorded human choice to approve or reject a reviewed [change proposal](#change-proposal). The implemented use case accepts only the first decision while the run awaits approval, requires a reason for rejection, and binds the choice to the canonical base revision, diff hash, plan version, passed verification status, and verification-evidence hash. It replays the same idempotency key and reports competing decisions as conflicts. Its Postgres adapter enforces one decision per run and unique idempotency keys while retaining legacy unbound rows as non-deliverable audit history; the authenticated API handler persists before [workflow approval](#workflow-approval), retries exact replays, and withholds HTTP success when Temporal signaling fails. Approval permits GitHub delivery only for that exact evidence; rejection ends the run without publishing repository changes. Live persistence verification remains planned.

### Autonomous GitHub Maintainer

The planned product that turns a supported GitHub issue into a reproduced, tested, human-reviewed pull-request proposal through a durable maintenance workflow.

### Boundary Registry

The executable `boundaries.config.mjs` file that canonically declares production coverage, workspaces, modules, composition files, and allowed dependency edges.

### Change Proposal

The reviewable result of a maintenance run: the implementation plan, source diff, verification evidence, critique outcome, and proposed pull-request description. The implemented workflow produces a versioned plan and independently measured unified diff only after failure reproduction, requires exact agreement between planned and changed files, records the canonical safety decision, advances ready proposals through bounded verification and critique attempts, and persists the accepted final result as a [review snapshot](#review-snapshot). Pull-request description and workflow delivery orchestration remain later stages.

### Co-Located Docs

Optional Markdown files named `*.docs.md` that live next to one concrete
source or configuration file and capture local guidance that would be hard to
recover quickly from code alone.

They are discovered by adjacency rather than through the global docs index.

### Conceptual Module

A first-level folder inside a workspace source root that owns one coherent product concept or application responsibility and exposes an explicit public interface.

### Conceptual Package

A non-deployable monorepo workspace that owns a coherent product or application concept with a focused reason to change and a public package interface.

### Control-Plane API

The deployable application boundary that authenticates users, accepts commands, and serves durable run evidence and live progress without executing target-repository tools. Its executable Node deployment dispatches review evidence, human approval, timeline SSE, and GitHub webhook routes; constructs the shared single-operator bearer policy; and composes one Postgres pool, the review-snapshot/timeline/approval stores and query, one Redis stream, one reusable Temporal client resource, GitHub ingestion, workflow submission and approval notification, pull-request reconciliation, and deterministic signal-driven shutdown. It starts persisted issue runs and signals persisted decisions but does not execute worker Activities.

### Critique Decision

The evidence-backed result of reviewing a ready [change proposal](#change-proposal) after verification. It accepts the proposal, requests a correctable retry, or rejects it. Passing verification is necessary but does not by itself prove that scope and regression risk are acceptable.

### Expected Failure Fragment

The bounded text that identifies the issue's reported failure in test output. A run requester must place exactly one non-empty fragment of at most 500 characters between `<!-- patch-pilot:expected-failure -->` and `<!-- /patch-pilot:expected-failure -->` in the opted-in GitHub issue. Patch Pilot persists the trimmed text instead of guessing from general issue prose and accepts [failure reproduction](#failure-reproduction) only when the failing command output contains that exact fragment.

### Failure Reproduction

The evidence-backed attempt to demonstrate the bug reported by an issue. Patch Pilot accepts a reproduction only when the supported project's standard test command exits unsuccessfully and its captured output contains the persisted [expected failure fragment](#expected-failure-fragment); unrelated command failures are kept distinct. The Temporal workflow implements this attempt in a fresh exact-revision workspace through the canonical safe executor. Only accepted reproduction becomes planning-ready; unsupported, not-reproduced, different-failure, and execution-failed classifications are terminal outcomes.

### GitHub App Installation Token

A short-lived credential issued for one GitHub App installation. The implemented delivery transport requests a token for only the target repository and only `contents:write` plus `pull_requests:write`, treats its format as opaque, coalesces concurrent refreshes, and discards it from use one minute before GitHub's expiration. It is held in memory and sent only through authorization headers.

### GitHub Delivery

The controlled publication step after an [approval decision](#approval-decision). The implemented provider-free use case recomputes the source-diff hash, requires an exact passed approval binding, derives a deterministic branch, requests only a linked draft pull request, and treats matching durable or concurrent retries as replays. Its Postgres store atomically retains complete evidence and constrains provider identities against collisions. Its authenticated GitHub App transport supplies repository-scoped [installation tokens](#github-app-installation-token); its commit publisher strictly applies the exact approved UTF-8 text diff to the immutable base and creates deterministic Git objects; and its REST adapter exactly creates or replays the branch ref and open draft PR without force-updating changed provider state. The control-plane API composes the approval store and all delivery ports behind the environment-backed shared-pool lifecycle. Live proof remains planned; automatic merge is prohibited.

### GitHub Delivery Observation

An immutable comparison between one tracked [GitHub delivery](#github-delivery) and a later `pull_request` webhook. The implemented reconciliation use case records normal lifecycle state as matched when the installation, repository, URL, head branch and revision, and base branch remain exact; otherwise it lists provider drift without changing GitHub or the original delivery. A concrete Postgres store atomically reserves each unique delivery identity and reloads the first writer for exact redelivery replay. The control-plane delivery runtime connects these ports to bounded signed HTTP ingestion with stable acknowledgement, rejection, and conflict responses; live provider and persistence verification remains planned.

### Global Docs

The canonical documentation files under `docs/` that define repository-wide
facts, workflow rules, routing metadata, and shared terminology.

They are routed through `docs/_index.md` and area `_index.md` files.

### Indexed Docs System

The repository documentation model that separates [global docs](#global-docs)
under `docs/` from optional [co-located docs](#co-located-docs) and uses
structured `_index.md` files for discoverability.

### Issue Context

The immutable issue-side planning evidence accepted when a GitHub issue requests a run: a trimmed non-empty title of at most 500 characters and the trimmed descriptive body outside the expected-failure marker of at most 8,000 characters. It is persisted with the [maintenance run](#maintenance-run) before Temporal starts. The separate [expected failure fragment](#expected-failure-fragment) remains reproduction evidence and is not duplicated in this context.

### Maintenance Run

One durable execution of the Autonomous GitHub Maintainer for a specific repository, issue, bounded [issue context](#issue-context), immutable base revision, and explicit [expected failure fragment](#expected-failure-fragment). Its implemented initial state validates and atomically persists that complete evidence in Postgres and is submitted to Temporal with the same deterministic workflow identity. Unique run and source-delivery identities make webhook retries safe. A run advances through inspection, reproduction, planning, modification, verification, critique, and human approval.

### Maintenance Workflow

The Temporal-owned durable orchestration of one [maintenance run](#maintenance-run). The executable worker registers `maintenanceRunWorkflow`; its implemented phases record submitted, inspection, reproduction, planning-context, proposal, attempt, review, and approval events, use fresh exact-revision disposable checkouts, reproduce and verify through the canonical safe executor, and permit no more than two full proposal revisions. It atomically records an accepted [review snapshot](#review-snapshot), waits durably for an exactly bound [approval decision](#approval-decision), advances approval, and terminates human rejection explicitly. Unsupported, policy-blocked, critique-rejected, exhausted, and malformed outcomes also terminate visibly. Approved GitHub delivery orchestration remains planned.

### Monorepo

One source-control repository containing multiple declared application or package workspaces. This repository reserves `apps/*` and `packages/*` as npm workspace locations, while concrete workspaces are introduced only for known concepts.

### MVP Safety Policy

The fixed rules that decide which repository commands, planning-context files, and proposed changes may continue. The implemented policy allows only standard MVP test commands, binds execution to one repository workspace, specifies mandatory sandbox resources with no network, bounds and filters [repository planning context](#repository-planning-context), and rejects oversized or sensitive changes. Its Docker adapter maps execution rules to pinned runtime containers with a quota-controlled workspace copy and forced cleanup. Live runtime proof is still required before untrusted commands can be enabled in deployment.

### Pull-Request Proposal

The GitHub-ready branch, title, description, linked issue, diff, and verification summary prepared by an approved maintenance run. The implemented [GitHub delivery](#github-delivery) use case validates the exact approval binding and prepares deterministic branch and draft-pull-request requests behind injected ports. The MVP never merges the proposal automatically.

### Proposal Attempt

One visible apply-verify-critique pass for a versioned [change proposal](#change-proposal). The executable Activity restores the disposable checkout to the immutable base before applying each complete diff. The first pass and every retry retain their own proposal, [verification evidence](#verification-evidence), and [critique decision](#critique-decision); the MVP permits at most three attempts in total.

### Proposal Generator

The worker-owned provider adapter that converts bounded issue, reproduction, and [repository planning context](#repository-planning-context) evidence into structured plan and unified-diff candidates. The implemented adapter uses OpenAI Responses with strict JSON Schema, disabled response storage, bounded responses, and a pinned configurable model snapshot. It cannot bypass the provider-free [change proposal](#change-proposal) validation and safety boundary.

### Review Screen

The human-facing view of one reviewable maintenance run. It presents ordered timeline events, the plan and semantic diff, bounded verification evidence, and approve or reject actions only when the run is awaiting its first decision. The [control-plane API](#control-plane-api) authorizes `GET /runs/:runId/review-evidence`; its query composes the canonical snapshot, timeline, and optional decision, while the web server forwards only cookie or bearer credentials, bounds the evidence response, and renders escaped HTML under restrictive browser security headers. Approval actions send generated idempotency keys and bounded JSON through the same origin. The environment-configured web and API deployments, persisted-state query, and lifecycle wiring are implemented; live persistence verification remains planned.

### Review Snapshot

The immutable approval-gate record produced only after the final [change proposal](#change-proposal) has passed verification and received an accepted [critique decision](#critique-decision). It contains run identity, plan, exact diff, bounded verification, critique, and SHA-256 evidence bindings while deliberately excluding the [run timeline](#run-timeline) and [approval decision](#approval-decision), which remain separate canonical records. Its concrete Postgres store uses one first-writer row per run, the worker records it through a retry-safe Activity before durable approval waiting, and the API query joins the separate records only when serving review or approval state. Live persistence verification remains planned.

### Repository Planning Context

The deterministic bounded repository text selected after accepted [failure reproduction](#failure-reproduction) for plan and diff generation. It contains at most 12 issue-relevant safe UTF-8 files, 32 KiB each and 128 KiB total, discovered from no more than 1,000 entries and 200 allowed candidates. Sensitive, dependency, generated, binary, oversized, and symbolic-link content is excluded. Full text remains Temporal Activity evidence, while the [run timeline](#run-timeline) records only paths and byte metrics.

### Repository Workspace

A disposable checkout used by one maintenance run. Its Git boundary creates a unique directory, fetches one full immutable commit ID, verifies Detached HEAD, removes the remote, and guards cleanup targets. Proposal attempts restore and clean this exact base before checking and applying each complete bounded diff. The implemented sandbox copies the resulting workspace into a no-network, resource-limited container before an allowed command runs; live runtime proof and a future credential-injection policy remain open.

### Run Submission

An authenticated request to begin one [maintenance run](#maintenance-run). The executable GitHub ingestion path requires bounded [issue context](#issue-context) and one explicitly marked [expected failure fragment](#expected-failure-fragment), resolves the repository default branch through a repository-scoped App request, and retains the delivery, installation, repository, branch, issue, actor, full immutable base revision, and exact issue evidence. The concrete Postgres store atomically records the first submission and reloads it after matching run- or delivery-identity conflicts. Created and replayed canonical rows then enter [workflow submission](#workflow-submission), while identity conflicts never reach Temporal.

### Run Timeline

The ordered audit history of one [maintenance run](#maintenance-run). Postgres is canonical and assigns each stored event a run-local increasing sequence; Redis republishes that already-persisted event for low-latency viewers but is not a source of truth. Deterministic event IDs replay the canonical first evidence and reject conflicting reuse, making Temporal Activity retries safe. Implemented workflow events include inspection, reproduction, planning-context, proposal, attempt, review, approval waiting, and approval outcome; source context and unified diffs are deliberately omitted while paths, metrics, verification, critique, and bounded decision evidence remain visible. Live local-service verification remains open.

### Supported Project

A repository root whose manifests and test configuration match one deterministic MVP shape: TypeScript with an npm test script, or Python with recognizable pytest configuration. Ambiguous multi-shape roots are unsupported rather than guessed.

### Verification Evidence

Structured proof produced by repository checks, including the exact command, exit code, bounded output, duration, timeout, and truncation state. The implemented verifier classifies this evidence as passed, failed, or execution-failed. Human approval relies on the evidence rather than an agent claim that a fix works.

### Workflow Approval

The persistence-before-signal handoff of one canonical [approval decision](#approval-decision) to its waiting [maintenance workflow](#maintenance-workflow). Only a created decision or exact idempotent replay is sent as `reviewDecision` to the Temporal workflow whose ID equals the run ID. The API acknowledges success only after Temporal accepts the signal; provider failure remains visible so the same idempotency key can reload and signal the first writer again. Conflicts never signal, and the worker independently requires the same run and complete [review snapshot](#review-snapshot) binding.

### Workflow Submission

The idempotent handoff of one persisted [maintenance run](#maintenance-run) to Temporal. The control-plane API uses the run ID as the workflow ID, starts `maintenanceRunWorkflow` on the configured task queue, treats only Temporal's exact already-started outcome as a replay, and leaves provider failures visible for GitHub redelivery. The executable worker consumes this handoff through review and durable approval waiting; [workflow approval](#workflow-approval) is a separate command over the same API-owned Temporal client resource.

### Workspace

A package-manager-declared application or package boundary. Each production workspace must also be registered in the [boundary registry](#boundary-registry) before source files are added.

## Meta And Internal Terms

### Dictionary Coverage Pass

A review of the affected docs area after a substantive docs change to ensure
stable terms used by that area are present in `docs/DICTIONARY.md`, important
uses are linked where needed, and stale removed-term links are cleaned up.

### Local Development Environment

The repository-managed Docker Compose environment that runs the stateful services needed for local Patch Pilot development. It uses pinned images, local-only credentials, persistent developer volumes, and health checks; it is not a production deployment model. Use `npm run infra:up` to start it.

### System-Part Doc

A focused doc that explicitly documents one system part.

When this kind of doc is used, it should include `Responsibility`,
`Not responsible for`, `Inputs`, `Outputs`, and `Adjacent parts`.
