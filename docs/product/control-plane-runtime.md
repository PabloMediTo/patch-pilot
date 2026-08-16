# Control-Plane Runtime

## Responsibility

Compose and operate the executable [control-plane API](../DICTIONARY.md#control-plane-api) process with one HTTP listener, one shared Postgres pool, one Redis timeline stream, one Temporal submission connection, authenticated GitHub ingestion, and deterministic shutdown.

## Not responsible for

- provisioning or rotating deployment secrets
- implementing or executing Temporal workflows and Activities
- migrating production schemas outside the owning stores' idempotent initialization
- proving live provider behavior when Postgres, Redis, or GitHub are unavailable

## Inputs

- `PATCH_PILOT_API_BEARER_TOKEN` and `PATCH_PILOT_API_ACTOR_ID` for the single operator
- `PATCH_PILOT_GITHUB_WEBHOOK_SECRET`, `PATCH_PILOT_GITHUB_APP_ID`, and `PATCH_PILOT_GITHUB_APP_PRIVATE_KEY`
- optional `PATCH_PILOT_API_HOST` and `PATCH_PILOT_API_PORT`, defaulting to `127.0.0.1:3001`
- optional `PATCH_PILOT_POSTGRES_URL` and `PATCH_PILOT_REDIS_URL`, defaulting to the documented local services
- optional `PATCH_PILOT_TEMPORAL_ADDRESS`, `PATCH_PILOT_TEMPORAL_NAMESPACE`, and `PATCH_PILOT_TEMPORAL_TASK_QUEUE`, defaulting to `127.0.0.1:7233`, `default`, and `patch-pilot-maintenance`
- `SIGINT` or `SIGTERM` as process shutdown requests

## Outputs

- one listening Node HTTP server for webhook, review-evidence, approval, and timeline routes
- one shared Postgres pool used by review, timeline, approval, delivery, and reconciliation stores
- one Redis connection pair for live timeline subscriptions
- one reusable Temporal client connection for deterministic [workflow submission](workflow-submission.md)
- idempotent closure of the listener, active SSE connections, Redis clients, Temporal connection, and Postgres pool
- the existing approved pull-request delivery operation behind the same managed lifecycle

## Adjacent parts

- [control-plane authentication](control-plane-authentication.md) owns human bearer validation
- [review snapshots](review-snapshots.md), timeline history, and approval decisions remain separate canonical records joined by the API query
- [GitHub delivery reconciliation](github-delivery-reconciliation.md) consumes authenticated `pull_request` envelopes
- [GitHub run ingestion](github-ingestion.md) resolves and persists authenticated issue submissions before Temporal dispatch
- the [local development environment](local-development.md) supplies the default Postgres and Redis endpoints

## Lifecycle and failure rules

Configuration is validated before a listener starts. The deployment creates a single `pg` pool and passes it to every Postgres-backed store rather than allowing each adapter to create an independent pool. It also reuses one Temporal connection across run submissions. The delivery runtime owns final pool closure, while the deployment owns Temporal, Redis, and HTTP closure.

Startup rejects listener errors. Shutdown stops HTTP ingress first, force-closes long-lived connections such as SSE, and then attempts both Redis and Postgres cleanup even if one provider fails. Repeated shutdown requests share the same promise. `main.js` installs this operation for `SIGINT` and `SIGTERM` and reports cleanup failure through the process exit code.

The executable webhook path reconciles authenticated pull-request lifecycle events and routes opted-in issue events through repository-scoped base-revision resolution into atomic run persistence. Created and replayed runs then start the same deterministic Temporal workflow before the API acknowledges delivery. Temporal provider failures remain server errors so GitHub can redeliver; other valid event types are acknowledged as unsupported.
