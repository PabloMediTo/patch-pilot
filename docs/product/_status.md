# Product Status

## Current reality

- The product idea and initial system boundaries are documented.
- Delivery is organized in Markplane epics and initial tasks.
- The API, worker, and web application shells have executable composition roots and public application interfaces.
- The maintenance package can create the initial `submitted` state for a run bound to a repository, issue, and immutable base revision.
- A pinned [local development environment](../DICTIONARY.md#local-development-environment) provides Postgres, Redis, Temporal, and Temporal UI with readiness checks.
- Signed GitHub `issues` webhooks can request a run explicitly through the `patch-pilot` label, resolve an immutable base revision through an injected port, and emit an initial [run submission](../DICTIONARY.md#run-submission).
- A [repository workspace](../DICTIONARY.md#repository-workspace) can be created as a unique disposable checkout at an exact full commit SHA, with bounded non-interactive Git execution and guarded cleanup.
- Root manifests can identify one [supported project](../DICTIONARY.md#supported-project) as Python/pytest or TypeScript/npm and select its standard test command.
- [Failure reproduction](../DICTIONARY.md#failure-reproduction) classifies bounded executor evidence as reproduced, not reproduced, a different failure, or execution failure.
- No product database schema, Temporal workflow, concrete GitHub API adapter, HTTP transport, visual frontend, dependency restoration, or container command sandbox has been implemented.
- Strict architecture enforcement permits the API ingestion role to use the maintenance package and the exact `node:buffer` and `node:crypto` providers.

## Next milestone

Demonstrate a read-only maintenance run that accepts a GitHub repository and issue, checks out an immutable revision in isolation, identifies a supported Python or TypeScript project, reproduces the reported failure, and records a reviewable plan with verification evidence.

## Open questions

- Which LLM provider and model policy will be used for the MVP?
- Will the first environment use self-hosted Temporal or Temporal Cloud?
- Which container runtime and outbound dependency-download policy are available in deployment?
- Should approved delivery immediately open a draft pull request or first expose a final proposal for a second confirmation?
