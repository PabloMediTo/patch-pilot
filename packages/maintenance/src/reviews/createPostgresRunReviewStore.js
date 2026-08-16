const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS run_review_snapshots (
  run_id text PRIMARY KEY,
  repository text NOT NULL,
  issue_number integer NOT NULL CHECK (issue_number > 0),
  base_revision text NOT NULL CHECK (char_length(base_revision) = 40),
  plan_version integer NOT NULL CHECK (plan_version > 0),
  plan jsonb NOT NULL,
  source_diff text NOT NULL,
  diff_hash text NOT NULL CHECK (char_length(diff_hash) = 64),
  verification_status text NOT NULL CHECK (verification_status = 'passed'),
  verification_evidence jsonb NOT NULL,
  verification_evidence_hash text NOT NULL CHECK (char_length(verification_evidence_hash) = 64),
  critique jsonb NOT NULL,
  recorded_at timestamptz NOT NULL
);`;
const COLUMNS = `run_id, repository, issue_number, base_revision, plan_version, plan,
  source_diff, diff_hash, verification_status, verification_evidence,
  verification_evidence_hash, critique, recorded_at`;
const INSERT_SQL = `INSERT INTO run_review_snapshots (${COLUMNS})
VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10::jsonb, $11, $12::jsonb, $13::timestamptz)
ON CONFLICT DO NOTHING RETURNING ${COLUMNS};`;
const SELECT_SQL = `SELECT ${COLUMNS} FROM run_review_snapshots WHERE run_id = $1;`;

/**
 * Creates atomic Postgres persistence for immutable review snapshots.
 *
 * @param {{ connectionString?: string, pool?: object }} [options] Connection or injected pool.
 * @returns {Promise<object>} Snapshot persistence operations.
 */
export async function createPostgresRunReviewStore(options = {}) {
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
      return result.rows[0] === undefined ? null : mapSnapshot(result.rows[0]);
    },
    saveSnapshot: async (snapshot) => {
      await ensureSchema();
      const result = await pool.query(INSERT_SQL, snapshotValues(snapshot));
      if (result.rows[0] !== undefined) {
        return Object.freeze({ status: "created", snapshot: mapSnapshot(result.rows[0]) });
      }
      const existing = await pool.query(SELECT_SQL, [snapshot.run.id]);
      return existing.rows[0] === undefined
        ? Object.freeze({ status: "conflict", snapshot: null })
        : Object.freeze({ status: "existing", snapshot: mapSnapshot(existing.rows[0]) });
    },
    close: async () => pool.end(),
  });
}

/** Loads Postgres only for a concrete runtime connection. */
async function createPool(connectionString) {
  const { default: pg } = await import("pg");
  return new pg.Pool({ connectionString });
}

/** Maps one flat row into immutable review and approval evidence. */
function mapSnapshot(row) {
  const evidenceHash = row.verification_evidence_hash;
  return Object.freeze({ run: Object.freeze({ id: row.run_id, status: "awaiting-approval",
    repository: row.repository, issueNumber: row.issue_number, baseRevision: row.base_revision }),
  proposal: Object.freeze({ plan: freezeJson(row.plan), diff: row.source_diff,
    diffHash: row.diff_hash }), verification: Object.freeze({ status: row.verification_status,
    evidence: freezeJson(row.verification_evidence), evidenceHash }),
  critique: freezeJson(row.critique), reviewBinding: Object.freeze({ baseRevision: row.base_revision,
    diffHash: row.diff_hash, planVersion: row.plan_version,
    verification: Object.freeze({ status: row.verification_status, evidenceHash }) }),
  recordedAt: new Date(row.recorded_at).toISOString() });
}

/** Deeply freezes JSON loaded by the Postgres client. */
function freezeJson(value) {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach(freezeJson);
    Object.freeze(value);
  }
  return value;
}

/** Creates stable parameter order without interpolating review evidence. */
function snapshotValues(snapshot) {
  return [snapshot.run.id, snapshot.run.repository, snapshot.run.issueNumber,
    snapshot.run.baseRevision, snapshot.proposal.plan.version, JSON.stringify(snapshot.proposal.plan),
    snapshot.proposal.diff, snapshot.proposal.diffHash, snapshot.verification.status,
    JSON.stringify(snapshot.verification.evidence), snapshot.verification.evidenceHash,
    JSON.stringify(snapshot.critique), snapshot.recordedAt];
}
