# Run Timelines

## Responsibility

Persist the canonical ordered [run timeline](../DICTIONARY.md#run-timeline) in Postgres and distribute each already-persisted event over a run-scoped Redis live channel.

## Not responsible for

- scheduling workflow steps or retries
- treating Redis as durable or canonical storage
- serving HTTP or Server-Sent Events directly
- deciding which workflow facts should become events

## Inputs

- run ID, event type, JSON payload, event-ID generator, and clock
- Postgres connection pool or connection URL
- Redis clients or connection URL

## Outputs

- canonical event ID, run-local sequence, UTC occurrence time, type, and deeply immutable payload
- ordered persisted history for one run
- live run-scoped event publication and subscription
- visible partial-failure evidence when persistence succeeds but streaming fails

## Adjacent parts

- workers record progress after completing workflow operations
- Postgres remains the audit and catch-up source
- Redis fans new events out to connected API instances
- the control-plane API combines history queries and live subscriptions into one ordered feed for the web interface
- the review screen will render attempts, diffs, verification, critiques, and approval state from timeline data

## Persistence model

The Postgres adapter creates its schema idempotently on first use. A sequence row per run allocates an increasing integer in the same atomic statement that inserts the event. Event IDs are globally unique, and `(run_id, sequence)` is unique. Queries always order by sequence rather than trusting timestamps.

## Live delivery model

Each run uses `patch-pilot:run:<run-id>:timeline`. Publication occurs only after Postgres returns the canonical stored event. Redis does not assign IDs or ordering and does not repair missed messages; reconnecting consumers must reload Postgres history before resuming live delivery.

If publication fails, the operation returns `persisted-stream-failed` with safe error evidence. The stored event remains available for catch-up and must not be rolled back merely because a live viewer missed it.

## Control-plane feed

The API subscribes to Redis before querying Postgres. Live events arriving during the history query are buffered. Persisted history is emitted first in sequence order, then only newer buffered events are emitted. Once caught up, the feed ignores duplicate or stale sequences and forwards newer events directly.

This subscribe-before-query order closes the race in which an event could otherwise be committed after a history query but before live subscription. Closing the feed unsubscribes its run channel. A failed history query also unsubscribes before propagating the failure.

## Current verification boundary

SQL allocation, mapping, ordering, publication order, run-scoped channels, catch-up buffering, deduplication, failure cleanup, and adapter lifecycle are covered with focused test doubles. The actual Postgres and Redis clients are installed and loaded lazily for runtime connections. A live integration check remains required once Docker or equivalent local services are available.
