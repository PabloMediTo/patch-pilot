# Local Development Environment

The repository provides a [local development environment](../DICTIONARY.md#local-development-environment) for the stateful services required by the MVP.

Docker Desktop with Docker Compose is a prerequisite.

## Services

- Postgres is available on `localhost:5432` with the local-only database, user, and password `patch_pilot`.
- Redis is available on `localhost:6379` without authentication for local development only.
- Temporal is available on `localhost:7233` and persists its schemas in the local Postgres container.
- Temporal UI is available at `http://localhost:8080`.

The image versions are pinned in `compose.yaml`. This environment uses Temporal's `auto-setup` image and local credentials deliberately; it is not a production deployment model.

## Commands

Check whether Docker, required configuration names, and both pilot targets are ready without printing configuration values:

```powershell
npm run pilot:readiness
```

A nonzero result is expected while prerequisites are missing. See the [end-to-end pilot](end-to-end-pilot.md) for the report contract and live sequence.

Start the environment and wait for health checks:

```powershell
npm run infra:up
```

Inspect service state:

```powershell
npm run infra:status
```

Exercise the real Postgres timeline schema and Redis Pub/Sub path:

```powershell
npm run test:timeline-integration
```

The integration command fails when either service is unavailable. Override the defaults with `PATCH_PILOT_POSTGRES_URL` and `PATCH_PILOT_REDIS_URL` when the services do not use the documented local addresses.

Exercise the real worker sandbox and verify its effective container limits:

```powershell
npm run test:sandbox-integration
```

The command uses disposable fixtures and containers, verifies the canonical runtime invariants plus controlled timeout and output-overflow classification through the real Docker CLI port, emits only fixed check names, and fails rather than skipping when Docker or any required invariant is unavailable.

Stop containers while retaining local database volumes:

```powershell
npm run infra:down
```

To remove persisted local data intentionally, run `docker compose down --volumes` separately.

## Health Model

Postgres, Redis, and Temporal have container health checks. Temporal starts only after Postgres is healthy, and Temporal UI starts only after Temporal is healthy. `npm run infra:up` returns successfully only when the required services are ready or fails when the health deadline is exceeded.
