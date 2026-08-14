# Product

## Documents

### Product Overview

- Path: `docs/product/README.md`
- Summary: Human mental model for the Autonomous GitHub Maintainer and its controlled-maintenance stance.
- Read when: You need orientation to the product before reading focused behavior or system documents.
- Tags: product, overview, maintainer

### Product Status

- Path: `docs/product/_status.md`
- Summary: Current implementation reality, active product gaps, and immediate next milestone.
- Read when: You need to know what exists now versus what is only planned.
- Tags: product, status, current-state, gaps

### Product Decisions

- Path: `docs/product/_decisions.md`
- Summary: Rationale for the initial control plane, workflow, persistence, safety, and delivery choices.
- Read when: You need the reasons behind the proposed product shape or MVP tradeoffs.
- Tags: product, decisions, rationale, tradeoffs

### Product Vision

- Path: `docs/product/product-vision.md`
- Summary: User problem, promised outcome, users, success criteria, and non-goals.
- Read when: A task changes the product promise, target user, outcome, or success definition.
- Tags: product, vision, users, outcome

### Maintenance Workflow

- Path: `docs/product/maintenance-workflow.md`
- Summary: Durable issue-to-proposal lifecycle, retry behavior, evidence gates, and human approval.
- Read when: A task changes run states, agent steps, retries, approval, or delivery behavior.
- Tags: product, workflow, temporal, retry, approval

### System Composition

- Path: `docs/product/system-composition.md`
- Summary: Responsibilities and relationships of the control plane, worker, web interface, persistence, cache, and isolated repository workspace.
- Read when: A task changes system responsibilities, application boundaries, storage ownership, or runtime integration.
- Tags: product, system, components, postgres, redis, temporal

### MVP Scope

- Path: `docs/product/mvp-scope.md`
- Summary: Supported repositories and bugfixes, safety limits, acceptance criteria, and excluded capabilities.
- Read when: A task proposes functionality for the first releasable product or changes its limits.
- Tags: product, mvp, scope, safety, python, typescript
