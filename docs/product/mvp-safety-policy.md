# MVP Safety Policy

## Responsibility

Decide whether target-repository commands and proposed file changes fit the fixed [MVP safety policy](../DICTIONARY.md#mvp-safety-policy), and ensure allowed commands reach only an isolated sandbox port with mandatory limits.

## Not responsible for

- starting or managing the host Docker daemon
- restoring dependencies with temporary network access
- deciding whether a technically safe change is product-correct
- granting exceptions to the MVP policy

## Inputs

- an exact executable and ordered argument vector
- the repository workspace root and command working directory
- proposed changed paths and added/deleted line counts
- a bounded Docker CLI process port

## Outputs

- an allowed or blocked execution decision with stable reason codes
- an allowed or blocked change decision with stable reason codes
- a canonical sandbox specification for allowed commands
- bounded command evidence from the isolated container

## Adjacent parts

- project detection selects one of the allowed standard test commands
- failure reproduction consumes sandbox execution evidence
- planning and modification must pass the change assessment before review
- the worker composes the Docker CLI process port with this package's policy and container adapter

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

## Repository-context limits

Planning context uses a separate read policy because files such as `package.json` or `pyproject.toml` are useful evidence even though automatic modification is forbidden. Discovery streams at most 1,000 directory entries, considers at most 200 allowed candidates, and selects at most 12 UTF-8 text files, 32 KiB each and 128 KiB total. It excludes environment files, private keys, lockfiles, Git metadata, dependencies, virtual environments, caches, coverage, build/distribution output, generated areas, binary content, oversized files, and symbolic links. Sensitive checks are case-insensitive, and callers cannot substitute larger limits.

## Container adapter

The maintenance package maps the canonical specification to Docker without exposing an image or limit choice to callers. It selects pinned Node.js or Python images, creates a container with CPU, memory, writable-layer disk, process, output, timeout, capability, and network limits, copies the disposable repository workspace into the size-limited container layer, attaches to the command, and forcibly removes the container afterward. It deliberately does not bind-mount the host workspace because a bind mount would bypass the container writable-layer disk quota.

## Current enforcement boundary

Policy decisions, the sandbox specification, Docker command construction, failure handling, forced cleanup, the bounded Docker CLI process port, and their worker composition are implemented and unit-tested. The maintenance workflow now invokes this composed executor for reproduction in a fresh exact-revision workspace and supplies the workspace boundary required by policy. The executor creates unpredictable container names internally, invokes Docker without a shell, applies the requested timeout and output bound, and returns the common command-evidence shape. Execution against a real Docker runtime remains necessary to prove that every resource and network limit behaves as expected. Until that live proof exists, untrusted target-repository commands remain disabled in deployed environments.
