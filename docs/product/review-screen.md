# Review Screen

## Responsibility

Present the persisted [change proposal](../DICTIONARY.md#change-proposal), [verification evidence](../DICTIONARY.md#verification-evidence), and ordered [run timeline](../DICTIONARY.md#run-timeline) needed for one human [approval decision](../DICTIONARY.md#approval-decision).

## Not responsible for

- deciding whether a proposal is correct
- persisting an approval decision
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
- an approval endpoint will validate and persist the human action
- GitHub delivery consumes only an approved result

## Current enforcement boundary

The web application implements and tests the framework-independent view model and HTML rendering. All repository and agent-authored text is escaped before insertion. Decided or non-reviewable runs do not expose approval actions. API data loading, live browser updates, approval submission handling, and visual styling remain open.
