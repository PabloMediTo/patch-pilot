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

Start the environment and wait for health checks:

```powershell
npm run infra:up
```

Inspect service state:

```powershell
npm run infra:status
```

Stop containers while retaining local database volumes:

```powershell
npm run infra:down
```

To remove persisted local data intentionally, run `docker compose down --volumes` separately.

## Health Model

Postgres, Redis, and Temporal have container health checks. Temporal starts only after Postgres is healthy, and Temporal UI starts only after Temporal is healthy. `npm run infra:up` returns successfully only when the required services are ready or fails when the health deadline is exceeded.
