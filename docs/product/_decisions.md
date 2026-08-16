# Product Decisions

## TypeScript control plane

The product control plane, worker, and frontend will use TypeScript. Target repositories may use Python or TypeScript, but their commands execute inside isolated repository workspaces.

This aligns the implementation with the existing npm and architecture enforcement while keeping target-language support independent from the control-plane language.

## Durable workflow ownership

Temporal owns maintenance-run execution and waiting. Postgres provides the durable product query and audit model but does not duplicate workflow-control decisions.

## Evidence before modification

A run must reproduce the reported problem before modifying code. If reproduction cannot be established, the run stops for human review instead of claiming a speculative fix.

## Bounded issue evidence at submission

Authenticated issue submission persists a trimmed title, the descriptive body outside the expected-failure marker, and the exact marked failure fragment before Temporal starts. Title, context, and failure evidence have separate product-owned bounds. Missing or oversized evidence is rejected rather than silently truncated so planning and reproduction always use the exact immutable text accepted from GitHub.

## Bounded repository evidence before generation

Planning receives a deterministic safe subset of repository text rather than unrestricted filesystem access or a full checkout snapshot. Selection is issue-aware but provider-free, excludes secrets and non-source areas, and has fixed candidate, file, per-file, and total-byte limits. Full selected text stays in Temporal Activity evidence; the live timeline retains only paths and sizes. Generator providers cannot broaden this collection boundary.

## Structured provider output behind domain validation

The MVP worker uses the OpenAI Responses API with strict JSON Schema output and a pinned `gpt-5.4-mini` snapshot for plan and diff candidates. Provider selection, credentials, HTTP behavior, and prompts remain in a worker application role. The maintenance package still parses, bounds, traces, and safety-assesses every result independently, so schema conformance never substitutes for product validation. Requests disable provider-side response storage, and the timeline omits the generated source diff.

## Human-controlled delivery

The system may inspect, plan, modify, and verify autonomously in isolation. Publishing a branch or pull request requires an explicit approval decision. Automatic merge is outside the MVP.

## Single-operator bearer authentication

The MVP control plane authenticates one deployment-configured operator through a bearer credential and records a separate stable actor identity in approval evidence. This avoids introducing account provisioning, session storage, or partially defined multi-tenant access rules before the product needs them. The web origin may forward the bearer header, but authentication remains owned by the API deployment. A future multi-user policy must replace this adapter explicitly rather than extending its all-runs authorization semantics implicitly.

## Redis is not canonical storage

Redis supports short-lived caches and live progress delivery. Durable run facts, plans, tool calls, verification results, and approval decisions remain in Postgres.

## Late package extraction

The MVP begins with one conceptual `maintenance` package and thin deployable application shells. Additional packages require demonstrated independent ownership or lifecycle rather than technical-layer naming.
