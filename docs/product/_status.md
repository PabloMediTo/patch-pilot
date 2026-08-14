# Product Status

## Current reality

- The product idea and initial system boundaries are documented.
- Delivery is organized in Markplane epics and initial tasks.
- The API, worker, and web application shells have executable composition roots and public application interfaces.
- The maintenance package can create the initial `submitted` state for a run bound to a repository, issue, and immutable base revision.
- No database schema, Temporal workflow, GitHub App, HTTP transport, or visual frontend has been implemented.
- Strict architecture enforcement permits only each shell's local composition-to-application edge; no cross-workspace dependency exists yet.

## Next milestone

Demonstrate a read-only maintenance run that accepts a GitHub repository and issue, checks out an immutable revision in isolation, identifies a supported Python or TypeScript project, reproduces the reported failure, and records a reviewable plan with verification evidence.

## Open questions

- Which LLM provider and model policy will be used for the MVP?
- Will the first environment use self-hosted Temporal or Temporal Cloud?
- Which container runtime and outbound dependency-download policy are available in deployment?
- Should approved delivery immediately open a draft pull request or first expose a final proposal for a second confirmation?
