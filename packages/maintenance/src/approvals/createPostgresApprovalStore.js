const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS run_approval_decisions (
  run_id text PRIMARY KEY,
  actor_id text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  decision_status text NOT NULL CHECK (decision_status IN ('approved', 'rejected')),
  reason text,
  decided_at timestamptz NOT NULL
);`;

const INSERT_SQL = `
INSERT INTO run_approval_decisions
  (run_id, actor_id, idempotency_key, decision_status, reason, decided_at)
VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
ON CONFLICT DO NOTHING
RETURNING run_id, actor_id, idempotency_key, decision_status, reason, decided_at;`;

const SELECT_SQL = `
SELECT run_id, actor_id, idempotency_key, decision_status, reason, decided_at
FROM run_approval_decisions WHERE run_id = $1;`;

/**
 * Creates atomic Postgres persistence for first approval decisions.
 *
 * @param {{ connectionString?: string, pool?: object }} [options] Connection or injected pool.
 * @returns {Promise<object>} Decision persistence operations.
 */
export async function createPostgresApprovalStore(options = {}) {
  const pool = options.pool ?? await createPool(options.connectionString);
  let schemaPromise;
  const ensureSchema = async () => {
    schemaPromise ??= pool.query(SCHEMA_SQL);
    await schemaPromise;
  };

  return Object.freeze({
    get: async (runId) => {
      await ensureSchema();
      const result = await pool.query(SELECT_SQL, [runId]);
      return result.rows[0] === undefined ? null : mapDecision(result.rows[0]);
    },
    saveFirstDecision: async (decision) => {
      await ensureSchema();
      const result = await pool.query(INSERT_SQL, decisionValues(decision));
      if (result.rows[0] !== undefined) return Object.freeze({ status: "created", decision: mapDecision(result.rows[0]) });
      const existing = await pool.query(SELECT_SQL, [decision.runId]);
      return Object.freeze({ status: "existing", decision: mapDecision(existing.rows[0]) });
    },
    close: async () => pool.end(),
  });
}

/** Loads Postgres only for a concrete runtime connection. */
async function createPool(connectionString) {
  const { default: pg } = await import("pg");
  return new pg.Pool({ connectionString });
}

/** Maps a stored row to immutable domain evidence. */
function mapDecision(row) {
  return Object.freeze({ runId: row.run_id, actorId: row.actor_id, idempotencyKey: row.idempotency_key,
    status: row.decision_status, reason: row.reason, decidedAt: new Date(row.decided_at).toISOString() });
}

/** Creates ordered query values without interpolating user content. */
function decisionValues(decision) {
  return [decision.runId, decision.actorId, decision.idempotencyKey, decision.status, decision.reason, decision.decidedAt];
}
