# Review Screen

## Responsibility

Present the persisted [change proposal](../DICTIONARY.md#change-proposal), [verification evidence](../DICTIONARY.md#verification-evidence), and ordered [run timeline](../DICTIONARY.md#run-timeline) needed for one human [approval decision](../DICTIONARY.md#approval-decision).

## Not responsible for

- deciding whether a proposal is correct
- composing the API handler with concrete authentication and persisted evidence stores
- publishing a branch or pull request
- treating Redis live events as canonical evidence

## Inputs

- run identity and current state
- ordered timeline events
- implementation plan and unified diff
- bounded verification evidence
- an existing approval decision, when present

## Outputs

- an immutable review view model
- escaped server-deliverable HTML with timeline, plan, semantic diff lines, and test evidence
- responsive same-origin styling for desktop and mobile review layouts
- a bounded server-side API client that forwards only cookie or bearer credentials
- approve and reject form actions only while the run is awaiting its first decision

## Adjacent parts

- the API authorizes and supplies persisted evidence through `GET /runs/:runId/review-evidence`, plus live timeline events
- the approval use case validates the first human action and delegates atomic persistence
- GitHub delivery consumes only an approved result

## Current enforcement boundary

The web application implements and tests the review model, HTML rendering, same-origin live timeline client, responsive stylesheet, HTTP dispatcher, concrete Node HTTP server, and executable environment-configured main process. Repository and agent-authored text is escaped on the server, and streamed event fields enter the DOM only through `textContent`. The restrictive CSP permits only same-origin scripts, styles, connections, and form actions. For initial HTML, the server-side review client forwards only `cookie` or `authorization` to the API, bounds the response to two MiB by default, and maps authorized evidence, unauthorized access, and missing reviews without giving the web process its own session policy. Timeline and approval requests remain streaming pass-through routes. Browser verification proves desktop, mobile, approval-control, overflow, and live-event behavior. Concrete API listener composition with authentication and persisted evidence stores remains open; live Postgres and Redis verification remains separately blocked by unavailable Docker.
