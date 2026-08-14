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
- complete cleanup on checkout failure or explicit removal

## Adjacent parts

- GitHub ingestion supplies the authorized repository and immutable revision
- the maintenance worker creates and removes workspaces for workflow activities
- repository understanding inspects the checked-out files
- the execution-safety policy will constrain commands run inside the workspace

## Checkout invariants

Git is invoked without a shell, interactive credential prompts are disabled, command time and output are bounded, and only the requested commit is fetched without tags. The checkout uses Detached HEAD and must resolve exactly to the requested full commit ID.

Repository URLs with embedded credentials are rejected so secrets cannot enter command arguments or `.git/config`. After verification, the `origin` remote is removed so the repository location is not retained. A failed checkout is deleted before the error is returned.

Removal accepts only generated `repository-*` children beneath the declared workspace root. It rejects the root itself, siblings, and arbitrary external paths.

This is filesystem and Git-reference isolation. Execution isolation for untrusted repository commands remains a separate required safety boundary.
