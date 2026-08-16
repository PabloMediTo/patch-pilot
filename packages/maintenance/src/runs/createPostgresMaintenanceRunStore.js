const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS maintenance_runs (
  run_id text PRIMARY KEY,
  installation_id bigint CHECK (installation_id > 0),
  repository text NOT NULL,
  issue_number integer NOT NULL CHECK (issue_number > 0),
  default_branch text,
  base_revision text NOT NULL CHECK (char_length(base_revision) = 40),
  actor_id bigint CHECK (actor_id > 0),
  source_delivery_id text UNIQUE,
  run_status text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);`;
const COLUMNS = `run_id, installation_id, repository, issue_number, default_branch,
  base_revision, actor_id, source_delivery_id, run_status, submitted_at`;
const INSERT_SQL = `INSERT INTO maintenance_runs (${COLUMNS.replace(", submitted_at", "")})
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
ON CONFLICT DO NOTHING RETURNING ${COLUMNS};`;
const SELECT_SQL = `SELECT ${COLUMNS} FROM maintenance_runs WHERE run_id = $1;`;
const SELECT_CONFLICT_SQL = `SELECT ${COLUMNS} FROM maintenance_runs
WHERE run_id = $1 OR source_delivery_id = $2
ORDER BY CASE WHEN run_id = $1 THEN 0 ELSE 1 END;`;

/**
 * Creates atomic Postgres persistence for submitted maintenance runs.
 *
 * @param {{ connectionString?: string, pool?: object }} [options] Connection or injected pool.
 * @returns {Promise<object>} Submitted-run persistence operations.
 */
export async function createPostgresMaintenanceRunStore(options = {}) {
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
      return result.rows[0] === undefined ? null : mapRun(result.rows[0]);
    },
    saveSubmittedRun: async (run) => {
      assertSubmittedRun(run);
      await ensureSchema();
      const result = await pool.query(INSERT_SQL, runValues(run));
      if (result.rows[0] !== undefined) {
        return Object.freeze({ status: "created", run: mapRun(result.rows[0]) });
      }
      const existing = await pool.query(SELECT_CONFLICT_SQL,
        [run.id, run.sourceDeliveryId ?? null]);
      return existing.rows.length === 1
        ? Object.freeze({ status: "existing", run: mapRun(existing.rows[0]) })
        : Object.freeze({ status: "conflict", run: null });
    },
    close: async () => pool.end(),
  });
}

/** Loads Postgres only for a concrete runtime connection. */
async function createPool(connectionString) {
  const { default: pg } = await import("pg");
  return new pg.Pool({ connectionString });
}

/** Requires the canonical initial run state before first-writer persistence. */
function assertSubmittedRun(run) {
  if (run?.status !== "submitted") {
    throw new Error("Maintenance run store accepts only submitted runs.");
  }
}

/** Maps one database row to detached immutable run evidence. */
function mapRun(row) {
  return Object.freeze({ id: row.run_id,
    installationId: row.installation_id === null ? undefined : Number(row.installation_id),
    repository: row.repository, issueNumber: row.issue_number,
    ...(row.default_branch === null ? {} : { defaultBranch: row.default_branch }),
    baseRevision: row.base_revision,
    actorId: row.actor_id === null ? undefined : Number(row.actor_id),
    sourceDeliveryId: row.source_delivery_id ?? undefined,
    status: row.run_status, submittedAt: new Date(row.submitted_at).toISOString() });
}

/** Creates stable parameter order without interpolating run evidence. */
function runValues(run) {
  return [run.id, run.installationId ?? null, run.repository, run.issueNumber,
    run.defaultBranch ?? null, run.baseRevision, run.actorId ?? null,
    run.sourceDeliveryId ?? null, run.status];
}
