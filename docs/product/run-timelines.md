# Run Timelines

## Responsibility

Persist the canonical ordered [run timeline](../DICTIONARY.md#run-timeline) in Postgres and distribute each already-persisted event over a run-scoped Redis live channel.

## Not responsible for

- scheduling workflow steps or retries
- treating Redis as durable or canonical storage
- running an HTTP listener or defining the application's authorization policy
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
- resumable Server-Sent Events frames and heartbeat comments through an injected response port

## Adjacent parts

- workers record progress after completing workflow operations
- the maintenance workflow records planning readiness only after accepted reproduction and terminal evidence for every non-planning outcome
- planning-context events retain selected paths and byte metrics while full source content remains in Temporal Activity evidence
- proposal events retain plan identity, paths, change metrics, and safety outcome while omitting the unified source diff
- attempt events retain plan versions, change metrics, bounded verification evidence, and critiques while omitting every unified source diff
- Postgres remains the audit and catch-up source
- Redis fans new events out to connected API instances
- the control-plane API combines history queries and live subscriptions into one ordered feed for the web interface
- the review screen will render attempts, diffs, verification, critiques, and approval state from timeline data

## Persistence model

The Postgres adapter creates its schema idempotently on first use. A sequence row per run allocates an increasing integer in the same atomic statement that inserts the event. Event IDs are globally unique, and `(run_id, sequence)` is unique. Repeating the same deterministic event ID returns the canonical first event; reusing that ID for different run, type, time, or payload evidence is rejected. A racing replay may consume an unused sequence number, so ordering is increasing rather than gapless. Queries always order by sequence rather than trusting timestamps.

## Live delivery model

Each run uses `patch-pilot:run:<run-id>:timeline`. Publication occurs only after Postgres returns the canonical stored event. Redis does not assign IDs or ordering and does not repair missed messages; reconnecting consumers must reload Postgres history before resuming live delivery.

The adapter installs error listeners on both Redis clients before any connection begins. Provider error events are contained so they cannot terminate the Node.js process independently; the corresponding connect, publish, or subscribe promise remains the authoritative failure channel and still rejects to the caller. Connection attempts use a five-second socket timeout and at most five reconnect delays capped at 500 milliseconds, preventing an unavailable Redis service from hanging startup indefinitely. Closing the stream closes both owned clients.

If publication fails, the operation returns `persisted-stream-failed` with safe error evidence. The stored event remains available for catch-up and must not be rolled back merely because a live viewer missed it. An Activity retry may republish the same canonical sequence; API feeds and browser consumers deduplicate it by sequence.

## Control-plane feed

The API subscribes to Redis before querying Postgres. Live events arriving during the history query are buffered. Persisted history is emitted first in sequence order, then only newer buffered events are emitted. Once caught up, the feed ignores duplicate or stale sequences and forwards newer events directly.

This subscribe-before-query order closes the race in which an event could otherwise be committed after a history query but before live subscription. Closing the feed unsubscribes its run channel. A failed history query also unsubscribes before propagating the failure.

## Server-Sent Events session

The API role can expose the feed through an injected response port without owning a web framework. It starts a `text/event-stream` response with no-cache and keep-alive headers. Every timeline frame uses the run-local sequence as the SSE `id`, the event name `timeline`, and the canonical event as JSON data.

A reconnecting client supplies its last received sequence, and catch-up skips that sequence and all older events. A heartbeat comment is written every 15 seconds after catch-up completes. Client disconnect is idempotent, cancels the heartbeat, and closes the Redis subscription; a disconnect during catch-up closes the subscription as soon as initialization finishes.

## HTTP route

The API exposes `GET /runs/:runId/timeline` through a Node-compatible request/response handler. The route decodes the run ID, validates an optional non-negative integer `Last-Event-ID`, calls an injected run-access authorization port, and starts the SSE session only after access succeeds. The concrete API server composes this handler without buffering its response and supplies the repeating heartbeat scheduler.

Unmatched paths remain available to other handlers. A matched non-GET request returns `405` with `Allow: GET`; malformed resume state returns `400`; denied access returns `401`. The handler adapts the request close event to SSE cleanup but does not start a listener or decide how user identity maps to run access.

## Current verification boundary

SQL allocation, mapping, ordering, publication order, run-scoped channels, bounded Redis connection retries, Redis event containment with promise rejection, catch-up buffering, deduplication, SSE resume/heartbeat/disconnect behavior, HTTP route/authentication gates, API dispatch, failure cleanup, and adapter lifecycle are covered with focused test doubles. The actual Postgres and Redis clients are installed and loaded lazily for runtime connections.

`npm run test:timeline-integration` exercises both real providers together. It subscribes first, persists two uniquely scoped events, requires both Redis deliveries within five seconds, and passes the write results, live deliveries, and ordered Postgres history to a provider-free evidence verifier. The verifier requires exact canonical sequences, types, bounded probe payloads, successful persistence-and-streaming outcomes, and matching unique provider event IDs; focused tests cover success, partial streaming failure, ordering drift, missing delivery, and identity mismatch. The live command emits only a sanitized passed-check report and fails rather than skipping when services are unavailable. Its first successful execution remains required once Docker or equivalent local services are available.
