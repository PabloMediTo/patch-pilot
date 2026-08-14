# MVP Safety Policy

## Responsibility

Decide whether target-repository commands and proposed file changes fit the fixed [MVP safety policy](../DICTIONARY.md#mvp-safety-policy), and ensure allowed commands reach only an isolated sandbox port with mandatory limits.

## Not responsible for

- implementing the container runtime that applies CPU, memory, disk, and network controls
- restoring dependencies with temporary network access
- deciding whether a technically safe change is product-correct
- granting exceptions to the MVP policy

## Inputs

- an exact executable and ordered argument vector
- the repository workspace root and command working directory
- proposed changed paths and added/deleted line counts
- an isolated sandbox execution port

## Outputs

- an allowed or blocked execution decision with stable reason codes
- an allowed or blocked change decision with stable reason codes
- a canonical sandbox specification for allowed commands

## Adjacent parts

- project detection selects one of the allowed standard test commands
- failure reproduction consumes sandbox execution evidence
- planning and modification must pass the change assessment before review
- the worker will own the concrete container sandbox adapter

## Execution limits

Only exact `npm test` and `python -m pytest` commands are accepted. The working directory must be the declared repository workspace or a descendant.

The canonical sandbox specification fixes:

- 2 CPUs
- 2 GiB memory
- 5 GiB disk
- 10-minute wall-clock timeout
- 1 MiB captured output
- no outbound network access
- filesystem access limited to the repository workspace

The operational entrypoint creates this policy internally; callers cannot substitute weaker values. Blocked requests never invoke the sandbox port.

## Change limits

A proposal may modify at most 10 unique files and 500 total added plus deleted lines. Repository traversal and absolute paths are rejected.

The MVP rejects changes to environment/secret files, private keys, dependency manifests, requirements files, lockfiles, migration directories, distribution output, and generated artifacts. These outcomes require rejection or a future explicit policy rather than an automatic exception.

## Current enforcement boundary

Policy decisions and the sandbox specification are implemented and tested. A concrete container adapter is still required to prove that the runtime applies every resource and network limit. Until that adapter exists, untrusted target-repository commands remain disabled.
