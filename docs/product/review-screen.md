# Review Screen

## Responsibility

Present the persisted [change proposal](../DICTIONARY.md#change-proposal), [verification evidence](../DICTIONARY.md#verification-evidence), and ordered [run timeline](../DICTIONARY.md#run-timeline) needed for one human [approval decision](../DICTIONARY.md#approval-decision).

## Not responsible for

- deciding whether a proposal is correct
- implementing the surrounding HTTP server and session provider
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
- approve and reject form actions only while the run is awaiting its first decision

## Adjacent parts

- the API supplies authenticated persisted evidence and live timeline events
- the approval use case validates the first human action and delegates atomic persistence
- GitHub delivery consumes only an approved result

## Current enforcement boundary

The web application implements and tests the review model, HTML rendering, and same-origin live timeline client. Repository and agent-authored text is escaped on the server, and streamed event fields enter the DOM only through `textContent`. The client listens to the API's named `timeline` SSE events, deduplicates run-local sequences, and relies on EventSource reconnection. The maintenance package validates and persists the first decision, while authenticated GET and POST handlers enforce run access. Live service verification, concrete server/session wiring, and visual styling remain open.
