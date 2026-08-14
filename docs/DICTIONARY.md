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

The recorded human choice to approve or reject a reviewed [change proposal](#change-proposal). The implemented use case accepts only the first decision while the run awaits approval, requires a reason for rejection, replays the same idempotency key, and reports competing decisions as conflicts. Its Postgres adapter enforces one decision per run and unique idempotency keys, while the authenticated API handler binds the actor and maps outcomes to HTTP. Approval permits GitHub delivery; rejection ends the run without publishing repository changes. Live verification and concrete server wiring remain planned.

### Autonomous GitHub Maintainer

The planned product that turns a supported GitHub issue into a reproduced, tested, human-reviewed pull-request proposal through a durable maintenance workflow.

### Boundary Registry

The executable `boundaries.config.mjs` file that canonically declares production coverage, workspaces, modules, composition files, and allowed dependency edges.

### Change Proposal

The reviewable result of a maintenance run: the implementation plan, source diff, verification evidence, critique outcome, and proposed pull-request description. The implemented first stage produces a versioned plan and independently measured unified diff only after failure reproduction, requires exact agreement between planned and changed files, and records the canonical safety decision; verification, critique, persistence, and pull-request description remain later stages.

### Co-Located Docs

Optional Markdown files named `*.docs.md` that live next to one concrete
source or configuration file and capture local guidance that would be hard to
recover quickly from code alone.

They are discovered by adjacency rather than through the global docs index.

### Conceptual Module

A first-level folder inside a workspace source root that owns one coherent product concept or application responsibility and exposes an explicit public interface.

### Conceptual Package

A non-deployable monorepo workspace that owns a coherent product or application concept with a focused reason to change and a public package interface.

### Critique Decision

The evidence-backed result of reviewing a ready [change proposal](#change-proposal) after verification. It accepts the proposal, requests a correctable retry, or rejects it. Passing verification is necessary but does not by itself prove that scope and regression risk are acceptable.

### Failure Reproduction

The evidence-backed attempt to demonstrate the bug reported by an issue. Patch Pilot accepts a reproduction only when the supported project's standard test command exits unsuccessfully and its captured output contains the issue's expected failure fragment; unrelated command failures are kept distinct.

### Global Docs

The canonical documentation files under `docs/` that define repository-wide
facts, workflow rules, routing metadata, and shared terminology.

They are routed through `docs/_index.md` and area `_index.md` files.

### Indexed Docs System

The repository documentation model that separates [global docs](#global-docs)
under `docs/` from optional [co-located docs](#co-located-docs) and uses
structured `_index.md` files for discoverability.

### Maintenance Run

One durable execution of the Autonomous GitHub Maintainer for a specific repository, issue, and immutable base revision. A run advances through inspection, reproduction, planning, modification, verification, critique, and human approval.

### Monorepo

One source-control repository containing multiple declared application or package workspaces. This repository reserves `apps/*` and `packages/*` as npm workspace locations, while concrete workspaces are introduced only for known concepts.

### MVP Safety Policy

The fixed rules that decide which repository commands and proposed changes may continue. The implemented policy allows only standard MVP test commands, binds execution to one repository workspace, specifies mandatory sandbox resources with no network, and rejects oversized or sensitive changes. Its Docker adapter maps those rules to pinned runtime containers with a quota-controlled workspace copy and forced cleanup, and the worker composes the adapter with bounded shell-free Docker process execution. Live runtime proof is still required before untrusted commands can be enabled in deployment.

### Pull-Request Proposal

The GitHub-ready branch, title, description, linked issue, diff, and verification summary prepared by an approved maintenance run. The MVP creates or presents this proposal but never merges it automatically.

### Proposal Attempt

One visible apply-verify-critique pass for a versioned [change proposal](#change-proposal). The first pass and every retry retain their own proposal, [verification evidence](#verification-evidence), and [critique decision](#critique-decision); the MVP permits at most three attempts in total.

### Review Screen

The human-facing view of one reviewable maintenance run. It presents ordered timeline events, the plan and semantic diff, bounded verification evidence, and approve or reject actions only when the run is awaiting its first decision. Its GET handler authorizes run access before loading evidence and serves escaped HTML under restrictive browser security headers. A same-origin EventSource client appends deduplicated timeline events using text-only DOM operations. Concrete server wiring and browser-level verification remain planned.

### Repository Workspace

A disposable checkout used by one maintenance run. Its Git boundary creates a unique directory, fetches one full immutable commit ID, verifies Detached HEAD, removes the remote, and guards cleanup targets. The implemented sandbox copies it into a no-network, resource-limited container before an allowed command runs; live runtime proof and a future credential-injection policy remain open.

### Run Submission

An authenticated request to begin one [maintenance run](#maintenance-run). For GitHub ingestion, it retains the delivery, installation, repository, issue, actor, and immutable base revision so later persistence and workflow adapters can process repeated deliveries idempotently.

### Run Timeline

The ordered audit history of one [maintenance run](#maintenance-run). Postgres is canonical and assigns each stored event a run-local sequence; Redis republishes that already-persisted event for low-latency viewers but is not a source of truth. The concrete adapters are implemented and unit-tested, while live local-service verification remains open.

### Supported Project

A repository root whose manifests and test configuration match one deterministic MVP shape: TypeScript with an npm test script, or Python with recognizable pytest configuration. Ambiguous multi-shape roots are unsupported rather than guessed.

### Verification Evidence

Structured proof produced by repository checks, including the exact command, exit code, bounded output, duration, timeout, and truncation state. The implemented verifier classifies this evidence as passed, failed, or execution-failed. Human approval relies on the evidence rather than an agent claim that a fix works.

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
