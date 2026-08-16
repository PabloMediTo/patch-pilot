# System Composition

This document composes the distinct system parts. It does not replace their future focused implementation documentation.

| Part | Responsibility | Not responsible for | Inputs | Outputs | Adjacent parts |
| --- | --- | --- | --- | --- | --- |
| Control-plane API | Authenticate users, validate requests, start runs, receive GitHub events, and serve query data | Executing repository commands or deciding fixes | User requests, GitHub webhooks | Temporal commands, run queries, SSE connections | Temporal, Postgres, web interface |
| Maintenance worker | Execute workflow activities and compose product modules | Persisting UI read models directly or serving HTTP | Temporal tasks, run policy | Activity results and progress events | Temporal, repository workspace, Postgres, Redis |
| Web interface | Present run submission, timeline, diff, evidence, and approval controls behind one browser origin | Running tools, owning API behavior, or publishing changes | API query data and live events | Run requests and approval decisions forwarded to the API | Control-plane API |
| Repository workspace | Provide one disposable, constrained checkout for inspection, modification, and tests | Owning workflow state or long-term artifacts | Repository, revision, commands, limits | Files, command results, diff, logs | Maintenance worker |
| Temporal | Persist workflow execution, retries, timers, and approval waiting | Product reporting or artifact storage | Workflow commands and signals | Durable workflow progress | API, worker |
| Postgres | Store product query state and durable audit records | Scheduling retries or live fan-out | Runs, steps, tool calls, plans, test results, review snapshots, approvals | Timeline and review queries | API, worker |
| Redis | Cache repository or model results and distribute live progress | Canonical workflow or approval storage | Cache entries and progress events | Cache hits and live event streams | API, worker |
| GitHub delivery | Read authorized issues and publish approved branches and pull requests | Approving its own proposal or merging | GitHub App installation, approved proposal | Issue context, branch, draft pull request | API, worker, GitHub |

## Monorepo target shape

```text
apps/
  maintainer-api/
  maintainer-worker/
  maintainer-web/
packages/
  maintenance/
```

The application workspaces are deployable shells. `packages/maintenance` owns product behavior through conceptual first-level modules such as runs, repository understanding, change proposals, verification, review, approvals, and delivery. Provider-specific adapters remain with their owning application role until real lifecycle pressure justifies extraction. The [maintenance worker runtime](maintenance-worker-runtime.md) registers the deterministic workflow bundle and composes the maintenance package's timeline, workspace, project-detection, reproduction, repository-context, proposal, attempt, and safety interfaces into separate Activities. Its [proposal generator](../DICTIONARY.md#proposal-generator) owns OpenAI configuration and HTTP behavior while the maintenance package remains provider-free. The attempt Activity joins workspace materialization, safe command execution, verification, critique, and bounded revision without moving those responsibilities into the workflow definition.

The web deployment owns the browser-facing origin. Its executable Node main process serves the review page and browser assets through the HTTP dispatcher. Initial review loading forwards only the browser's cookie or bearer credential to the API's bounded evidence endpoint; timeline and approval route shapes stream to the API over HTTP or HTTPS. Browser disconnects close the corresponding upstream request.

The [control-plane runtime](control-plane-runtime.md) has a concrete Node listener and one dispatcher for review evidence, approval commands, timeline SSE, and authenticated GitHub webhooks. Its transport owns bounded JSON or form parsing, SSE heartbeat scheduling, stable 404 behavior, and safe error termination. Its application runtime creates the [control-plane authentication](control-plane-authentication.md) role from environment values and supplies the same immutable bearer operator ports to approval, review-evidence, and timeline routes; route integrations cannot substitute competing authentication policies. A provider-free review query joins the canonical [review snapshot](../DICTIONARY.md#review-snapshot), [run timeline](../DICTIONARY.md#run-timeline), and [approval decision](../DICTIONARY.md#approval-decision) stores for initial reads and supplies the exact snapshot binding to the approval use case. The deployment owns one shared Postgres pool, one Redis stream, one reusable Temporal submission connection, listener startup, signal-driven shutdown, repository-scoped issue base-revision resolution, atomic run submission, and its `github-delivery` operation and pull-request reconciliation behind the same lifecycle. Persisted issue runs now reach deterministic [workflow submission](workflow-submission.md); worker-side workflow execution remains separate.

The maintenance package owns provider-free [GitHub delivery](github-delivery.md) behavior and its provider adapters as one conceptual module. The API shell joins their public interfaces with the approval store at the deployment boundary, so credential and pool lifecycle stay outside the evidence gate while the complete delivery path remains testable as one operation.
