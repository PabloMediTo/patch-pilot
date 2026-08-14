# MVP Scope

## Supported input

- one GitHub repository available through an installed GitHub App
- one open issue with enough information to investigate
- Python repositories using recognizable pytest and optional Ruff configuration
- TypeScript repositories using npm with recognizable test and ESLint scripts
- one immutable base revision per run

## Supported work

- small bugfixes with a reproducible failure
- focused changes of at most 10 files and 500 changed lines by default
- at most two modify-test-critique retries
- one human approval gate before GitHub delivery
- draft pull-request creation after approval

## Safety limits

- repository commands run only inside a disposable isolated workspace
- CPU, memory, disk, wall-clock, and output limits are mandatory
- outbound network access is denied by default and enabled narrowly for dependency restoration
- credentials are short-lived and scoped to one GitHub App installation
- secrets, generated artifacts, dependency upgrades, migrations, and lockfile rewrites require rejection or explicit future policy
- automatic merge and deployment are prohibited

## Acceptance criteria

The MVP is complete when a maintainer can submit a supported repository and issue, observe every workflow step, see a reproduced failure, review the plan and bounded diff, inspect passing test and lint evidence, approve or reject the exact proposal, and receive a linked draft pull request after approval.

## Failure outcomes

A run terminates visibly without a proposal when the repository is unsupported, checkout or installation policy fails, the issue cannot be reproduced, the retry budget is exhausted, verification remains red, the critique rejects the change, or the human rejects approval.
