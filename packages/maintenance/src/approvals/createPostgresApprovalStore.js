const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS run_approval_decisions (
  run_id text PRIMARY KEY,
  actor_id text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  decision_status text NOT NULL CHECK (decision_status IN ('approved', 'rejected')),
  reason text,
  decided_at timestamptz NOT NULL,
  base_revision text,
  diff_hash text,
  plan_version integer,
  verification_status text,
  verification_evidence_hash text
);
ALTER TABLE run_approval_decisions ADD COLUMN IF NOT EXISTS base_revision text;
ALTER TABLE run_approval_decisions ADD COLUMN IF NOT EXISTS diff_hash text;
ALTER TABLE run_approval_decisions ADD COLUMN IF NOT EXISTS plan_version integer;
ALTER TABLE run_approval_decisions ADD COLUMN IF NOT EXISTS verification_status text;
ALTER TABLE run_approval_decisions ADD COLUMN IF NOT EXISTS verification_evidence_hash text;`;

const INSERT_SQL = `
INSERT INTO run_approval_decisions
  (run_id, actor_id, idempotency_key, decision_status, reason, decided_at,
   base_revision, diff_hash, plan_version, verification_status, verification_evidence_hash)
VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7, $8, $9, $10, $11)
ON CONFLICT DO NOTHING
RETURNING run_id, actor_id, idempotency_key, decision_status, reason, decided_at,
  base_revision, diff_hash, plan_version, verification_status, verification_evidence_hash;`;

const SELECT_SQL = `
SELECT run_id, actor_id, idempotency_key, decision_status, reason, decided_at,
  base_revision, diff_hash, plan_version, verification_status, verification_evidence_hash
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
    status: row.decision_status, reason: row.reason, decidedAt: new Date(row.decided_at).toISOString(),
    reviewBinding: mapReviewBinding(row) });
}

/** Keeps legacy unbound rows readable but explicitly non-deliverable. */
function mapReviewBinding(row) {
  if ([row.base_revision, row.diff_hash, row.plan_version, row.verification_status,
    row.verification_evidence_hash].some((value) => value === null || value === undefined)) return null;
  return Object.freeze({ baseRevision: row.base_revision, diffHash: row.diff_hash,
    planVersion: row.plan_version, verification: Object.freeze({
      status: row.verification_status, evidenceHash: row.verification_evidence_hash,
    }) });
}

/** Creates ordered query values without interpolating user content. */
function decisionValues(decision) {
  return [decision.runId, decision.actorId, decision.idempotencyKey, decision.status, decision.reason,
    decision.decidedAt, decision.reviewBinding.baseRevision, decision.reviewBinding.diffHash,
    decision.reviewBinding.planVersion, decision.reviewBinding.verification.status,
    decision.reviewBinding.verification.evidenceHash];
}
