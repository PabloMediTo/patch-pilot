# Product Status

## Current reality

- The product idea and initial system boundaries are documented.
- Delivery is organized in Markplane epics and initial tasks.
- No product application workspace, package workspace, database schema, Temporal workflow, GitHub App, or frontend has been implemented.
- The repository remains a greenfield monorepo with strict architecture enforcement.

## Next milestone

Demonstrate a read-only maintenance run that accepts a GitHub repository and issue, checks out an immutable revision in isolation, identifies a supported Python or TypeScript project, reproduces the reported failure, and records a reviewable plan with verification evidence.

## Open questions

- Which LLM provider and model policy will be used for the MVP?
- Will the first environment use self-hosted Temporal or Temporal Cloud?
- Which container runtime and outbound dependency-download policy are available in deployment?
- Should approved delivery immediately open a draft pull request or first expose a final proposal for a second confirmation?
