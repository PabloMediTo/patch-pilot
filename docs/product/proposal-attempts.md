# Proposal Attempts

## Responsibility

Compose patch application, verification, critique, and revision into an immutable sequence of bounded [proposal attempts](../DICTIONARY.md#proposal-attempt).

## Not responsible for

- implementing patch application or workspace reset mechanics
- providing sandboxed command execution or a reviewer model
- retrying infrastructure Activities
- persisting attempt history or waiting for approval

## Inputs

- initial ready change proposal and supported project
- patch-application, bounded-executor, reviewer, and revision ports

## Outputs

- `completed`, `rejected`, or `exhausted` terminal outcome
- ordered immutable attempt history
- final proposal and its exact plan version

## Adjacent parts

- change proposals produce the initial bounded proposal
- verification and critiques own each attempt's evidence and decision
- the revision port produces a new proposal after a correctable finding
- durable workflow orchestration will persist attempts and handle infrastructure retries
- approval may start only from the completed final proposal

## Retry contract

The first proposal is attempt one. A retry decision may create at most two further attempts. Each revision must remain ready and advance the plan version by exactly one. All earlier proposals and evidence remain unchanged and reviewable.

Acceptance completes immediately. Rejection terminates immediately. A retry decision on attempt three returns `exhausted`; no fourth modification is requested. Execution failures reject this local loop without consuming a modification revision because Temporal Activity retry policy is a separate concern.
