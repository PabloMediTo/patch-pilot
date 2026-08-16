# Repository Workspaces

## Responsibility

Create and remove one disposable [repository workspace](../DICTIONARY.md#repository-workspace) whose Detached HEAD exactly matches the full immutable commit SHA recorded by a maintenance run.

## Not responsible for

- executing target-repository tests or package installation
- enforcing container CPU, memory, disk, network, or command policies
- retaining Git remotes or credentials after checkout
- owning durable workflow or artifact state

## Inputs

- a trusted root directory dedicated to generated workspaces
- a credential-free repository URL authorized for the current run; credentials may be supplied only through a non-interactive Git credential provider
- a full lowercase 40- or 64-character commit object ID

## Outputs

- a unique generated checkout directory beneath the trusted root
- the verified immutable base revision
- a materialized full proposal diff against the exact immutable base
- complete cleanup on checkout failure or explicit removal

## Adjacent parts

- GitHub ingestion supplies the authorized repository and immutable revision
- the maintenance worker creates and removes workspaces for workflow activities
- repository understanding inspects the checked-out files
- the [maintenance worker runtime](maintenance-worker-runtime.md) creates a short-lived inspection checkout and removes its local path from durable evidence
- the execution-safety policy will constrain commands run inside the workspace

## Checkout invariants

Git is invoked without a shell, interactive credential prompts are disabled, command time and output are bounded, and only the requested commit is fetched without tags. The checkout uses Detached HEAD and must resolve exactly to the requested full commit ID.

Repository URLs with embedded credentials are rejected so secrets cannot enter command arguments or `.git/config`. After verification, the `origin` remote is removed so the repository location is not retained. A failed checkout is deleted before the error is returned.

Removal accepts only generated `repository-*` children beneath the declared workspace root. It rejects the root itself, siblings, and arbitrary external paths.

## Proposal materialization

Every [proposal attempt](../DICTIONARY.md#proposal-attempt) restores its disposable checkout with `git reset --hard` to the already verified base revision and `git clean -fdx`. It writes the bounded full unified diff to a uniquely generated temporary directory inside that checkout, runs `git apply --check`, applies only after the check succeeds, and removes the temporary directory in `finally`. The operation rejects a mismatched HEAD, missing base revision, NUL content, or a diff above 256 KiB.

Retries are complete replacements against the immutable base, not incremental patches over a failed attempt. Destructive Git commands are confined to the generated disposable checkout and never target the Patch Pilot repository or an arbitrary caller directory.

This is filesystem and Git-reference isolation. Execution isolation for untrusted repository commands remains a separate required safety boundary.
