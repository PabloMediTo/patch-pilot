# End-to-End Pilot

## Responsibility

Prove the complete MVP path on one representative Python repository and one representative TypeScript repository, from opted-in issue ingestion through exact approval and linked draft-pull-request delivery.

## Not responsible for

- provisioning Docker, provider accounts, GitHub App installations, or secrets
- treating configuration presence as proof that a provider credential is valid
- weakening sandbox limits to make a pilot pass
- merging the resulting draft pull request

## Inputs

- a running Docker engine with Docker Compose and the valid repository `compose.yaml`
- the API, worker, OpenAI, and GitHub App environment values required by their executable deployments
- `PATCH_PILOT_PYTHON_PILOT_REPOSITORY` and `PATCH_PILOT_PYTHON_PILOT_ISSUE`
- `PATCH_PILOT_TYPESCRIPT_PILOT_REPOSITORY` and `PATCH_PILOT_TYPESCRIPT_PILOT_ISSUE`
- one installed GitHub App with access to both pilot repositories

## Outputs

- a sanitized readiness report with no environment values
- two durable maintenance runs with ordered evidence when the live pilot is executed
- one explicit rejected or failed outcome, or one linked draft pull request, per run
- retained live-provider evidence for the remaining timeline and sandbox acceptance work

## Adjacent parts

- the [local development environment](local-development.md) supplies Temporal, Postgres, and Redis
- the [MVP safety policy](mvp-safety-policy.md) remains mandatory during both runs
- the [maintenance workflow](maintenance-workflow.md) owns the durable issue-to-delivery path
- [GitHub delivery](github-delivery.md) publishes only an exactly approved proposal
- Markplane tasks `TASK-r7q5a` and `TASK-vr2yv` retain the live timeline and sandbox proof

## Readiness contract

Run:

```powershell
npm run pilot:readiness
```

The command invokes Docker with exact argument vectors and no shell. It checks the Docker engine, Docker Compose, and `docker compose config --quiet`. It also validates the presence of provider/runtime configuration, the minimum bearer-token length, a positive GitHub App identifier, two `owner/repository` pilot targets, and positive issue numbers.

The JSON result is `ready` only when every check passes. A blocked result exits nonzero and includes only check names, fixed failure reasons, and missing or malformed environment-variable names. It never prints environment values. Readiness is a prerequisite, not a successful pilot claim: provider authentication, service health, workflow evidence, and draft-pull-request results still require live execution.

## Live execution sequence

1. Run `npm run pilot:readiness` and resolve every reported blocker.
2. Start the pinned local services with `npm run infra:up`.
3. Run `npm run test:timeline-integration` to retain real Postgres/Redis ordering and fan-out proof.
4. Start the API, worker, and web deployments with the same configured task queue and provider identities.
5. Submit the explicitly marked issue in each configured pilot repository and observe the full timeline.
6. Verify reproduction, plan, diff, verification, critique, and exact review binding before approving or rejecting.
7. Confirm that rejection creates no provider mutation and that approval creates or exactly replays one linked draft pull request.
8. Retain the run identities and outcomes in `TASK-eankx`; only then may the live pilot acceptance boxes be completed.
