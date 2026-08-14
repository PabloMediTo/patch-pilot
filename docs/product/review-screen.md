# Review Screen

## Responsibility

Present the persisted [change proposal](../DICTIONARY.md#change-proposal), [verification evidence](../DICTIONARY.md#verification-evidence), and ordered [run timeline](../DICTIONARY.md#run-timeline) needed for one human [approval decision](../DICTIONARY.md#approval-decision).

## Not responsible for

- deciding whether a proposal is correct
- choosing the session provider or loading review evidence from a concrete data source
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
- approve and reject form actions only while the run is awaiting its first decision

## Adjacent parts

- the API supplies authenticated persisted evidence and live timeline events
- the approval use case validates the first human action and delegates atomic persistence
- GitHub delivery consumes only an approved result

## Current enforcement boundary

The web application implements and tests the review model, HTML rendering, same-origin live timeline client, responsive stylesheet, HTTP dispatcher, and concrete Node HTTP server. Repository and agent-authored text is escaped on the server, and streamed event fields enter the DOM only through `textContent`. The restrictive CSP permits only same-origin scripts, styles, connections, and form actions. The Node transport streams request and response bodies without buffering, preserves upstream status and headers, supports HTTP or HTTPS API origins, and tears down the upstream when the browser disconnects. Browser verification proves the two-column desktop layout, single-column 375-pixel layout, absence of page-level horizontal overflow, visible approval controls, and insertion of a live fourth timeline event. Main-process startup plus concrete session and evidence providers remain open; live Postgres and Redis verification remains separately blocked by unavailable Docker.
