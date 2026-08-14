# Product Decisions

## TypeScript control plane

The product control plane, worker, and frontend will use TypeScript. Target repositories may use Python or TypeScript, but their commands execute inside isolated repository workspaces.

This aligns the implementation with the existing npm and architecture enforcement while keeping target-language support independent from the control-plane language.

## Durable workflow ownership

Temporal owns maintenance-run execution and waiting. Postgres provides the durable product query and audit model but does not duplicate workflow-control decisions.

## Evidence before modification

A run must reproduce the reported problem before modifying code. If reproduction cannot be established, the run stops for human review instead of claiming a speculative fix.

## Human-controlled delivery

The system may inspect, plan, modify, and verify autonomously in isolation. Publishing a branch or pull request requires an explicit approval decision. Automatic merge is outside the MVP.

## Redis is not canonical storage

Redis supports short-lived caches and live progress delivery. Durable run facts, plans, tool calls, verification results, and approval decisions remain in Postgres.

## Late package extraction

The MVP begins with one conceptual `maintenance` package and thin deployable application shells. Additional packages require demonstrated independent ownership or lifecycle rather than technical-layer naming.
