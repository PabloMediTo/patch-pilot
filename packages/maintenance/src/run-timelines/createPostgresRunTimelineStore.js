const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS run_timeline_sequences (
  run_id text PRIMARY KEY,
  last_sequence bigint NOT NULL CHECK (last_sequence > 0)
);
CREATE TABLE IF NOT EXISTS run_timeline_events (
  event_id text PRIMARY KEY,
  run_id text NOT NULL,
  sequence bigint NOT NULL CHECK (sequence > 0),
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL,
  payload jsonb NOT NULL,
  UNIQUE (run_id, sequence)
);
CREATE INDEX IF NOT EXISTS run_timeline_events_run_sequence_idx
  ON run_timeline_events (run_id, sequence);
`;

const APPEND_SQL = `
WITH allocated AS (
  INSERT INTO run_timeline_sequences (run_id, last_sequence)
  VALUES ($1, 1)
  ON CONFLICT (run_id) DO UPDATE
    SET last_sequence = run_timeline_sequences.last_sequence + 1
  RETURNING last_sequence
)
INSERT INTO run_timeline_events (
  event_id, run_id, sequence, event_type, occurred_at, payload
)
SELECT $2, $1, allocated.last_sequence, $3, $4::timestamptz, $5::jsonb
FROM allocated
RETURNING event_id, run_id, sequence, event_type, occurred_at, payload;
`;

const LIST_SQL = `
SELECT event_id, run_id, sequence, event_type, occurred_at, payload
FROM run_timeline_events
WHERE run_id = $1
ORDER BY sequence ASC;
`;

/**
 * Creates the canonical Postgres timeline persistence adapter.
 *
 * @param {{ connectionString?: string, pool?: object }} [options] Connection or injected pool.
 * @returns {Promise<object>} Append, list, and close operations.
 */
export async function createPostgresRunTimelineStore(options = {}) {
  const pool = options.pool ?? await createPool(options.connectionString);
  let schemaPromise;

  return Object.freeze({
    append: async (event) => {
      schemaPromise ??= pool.query(SCHEMA_SQL);
      await schemaPromise;
      const result = await pool.query(APPEND_SQL, [
        event.runId,
        event.eventId,
        event.type,
        event.occurredAt,
        JSON.stringify(event.payload),
      ]);
      return mapDatabaseEvent(result.rows[0]);
    },
    list: async (runId) => {
      schemaPromise ??= pool.query(SCHEMA_SQL);
      await schemaPromise;
      const result = await pool.query(LIST_SQL, [runId]);
      return result.rows.map(mapDatabaseEvent);
    },
    close: async () => pool.end(),
  });
}

/**
 * Loads the Postgres provider only for a concrete runtime connection.
 *
 * @param {string | undefined} connectionString Postgres connection URL.
 * @returns {Promise<object>} Connection pool.
 */
async function createPool(connectionString) {
  const { default: pg } = await import("pg");
  return new pg.Pool({ connectionString });
}

/**
 * Maps database naming and types to one immutable timeline event.
 *
 * @param {object} row Postgres result row.
 * @returns {object} Canonical event.
 */
function mapDatabaseEvent(row) {
  return Object.freeze({
    eventId: row.event_id,
    runId: row.run_id,
    sequence: Number(row.sequence),
    type: row.event_type,
    occurredAt: new Date(row.occurred_at).toISOString(),
    payload: freezeJson(row.payload),
  });
}

/**
 * Deeply freezes JSON evidence returned by Postgres.
 *
 * @param {unknown} value JSON value.
 * @returns {unknown} Deeply immutable JSON value.
 */
function freezeJson(value) {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach(freezeJson);
    Object.freeze(value);
  }
  return value;
}
