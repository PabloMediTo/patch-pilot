# System Composition

This document composes the distinct system parts. It does not replace their future focused implementation documentation.

| Part | Responsibility | Not responsible for | Inputs | Outputs | Adjacent parts |
| --- | --- | --- | --- | --- | --- |
| Control-plane API | Authenticate users, validate requests, start runs, receive GitHub events, and serve query data | Executing repository commands or deciding fixes | User requests, GitHub webhooks | Temporal commands, run queries, SSE connections | Temporal, Postgres, web interface |
| Maintenance worker | Execute workflow activities and compose product modules | Persisting UI read models directly or serving HTTP | Temporal tasks, run policy | Activity results and progress events | Temporal, repository workspace, Postgres, Redis |
| Web interface | Present run submission, timeline, diff, evidence, and approval controls behind one browser origin | Running tools, owning API behavior, or publishing changes | API query data and live events | Run requests and approval decisions forwarded to the API | Control-plane API |
| Repository workspace | Provide one disposable, constrained checkout for inspection, modification, and tests | Owning workflow state or long-term artifacts | Repository, revision, commands, limits | Files, command results, diff, logs | Maintenance worker |
| Temporal | Persist workflow execution, retries, timers, and approval waiting | Product reporting or artifact storage | Workflow commands and signals | Durable workflow progress | API, worker |
| Postgres | Store product query state and durable audit records | Scheduling retries or live fan-out | Runs, steps, tool calls, plans, test results, approvals | Timeline and review queries | API, worker |
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

The application workspaces are deployable shells. `packages/maintenance` owns product behavior through conceptual first-level modules such as runs, repository understanding, change proposals, verification, review, approvals, and delivery. Provider-specific adapters remain with their owning concepts until real lifecycle pressure justifies extraction.

The web deployment owns the browser-facing origin. Its executable Node main process serves the review page and browser assets through the HTTP dispatcher. Initial review loading forwards only the browser's cookie or bearer credential to the API's bounded evidence endpoint; timeline and approval route shapes stream to the API over HTTP or HTTPS. Browser disconnects close the corresponding upstream request.

The control-plane deployment now has a concrete Node listener and one dispatcher for review evidence, approval commands, and timeline SSE. Its transport owns bounded JSON or form parsing, SSE heartbeat scheduling, stable 404 behavior, and safe error termination. Its [control-plane authentication](control-plane-authentication.md) role provides one environment-configured bearer operator to the approval and run-access ports. Its `github-delivery` application role composes one managed Postgres pool, the approval and delivery stores, GitHub App transport, deterministic commit publisher, branch/PR adapter, and delivery use case behind one operation with idempotent shutdown. General query providers and environment-backed pool, Redis, and secret composition remain unwired in the executable API main process.

The maintenance package owns provider-free [GitHub delivery](github-delivery.md) behavior and its provider adapters as one conceptual module. The API shell joins their public interfaces with the approval store at the deployment boundary, so credential and pool lifecycle stay outside the evidence gate while the complete delivery path remains testable as one operation.
