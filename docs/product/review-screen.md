# Review Screen

## Responsibility

Present the persisted [change proposal](../DICTIONARY.md#change-proposal), [verification evidence](../DICTIONARY.md#verification-evidence), and ordered [run timeline](../DICTIONARY.md#run-timeline) needed for one human [approval decision](../DICTIONARY.md#approval-decision).

## Not responsible for

- deciding whether a proposal is correct
- owning HTTP authentication and request parsing
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

The web application implements and tests the framework-independent view model and HTML rendering. All repository and agent-authored text is escaped before insertion. Decided or non-reviewable runs do not expose approval actions. The maintenance package validates the first decision and provides parameterized Postgres persistence with one row per run and unique idempotency keys. API data loading, live Postgres verification, live browser updates, HTTP submission handling, and visual styling remain open.
