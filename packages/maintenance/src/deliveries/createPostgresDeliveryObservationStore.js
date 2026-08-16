const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS run_github_delivery_observations (
  delivery_id text PRIMARY KEY,
  run_id text NOT NULL,
  action text NOT NULL CHECK (action IN (
    'opened', 'reopened', 'synchronize', 'converted_to_draft', 'ready_for_review', 'closed'
  )),
  repository text NOT NULL,
  installation_id bigint NOT NULL CHECK (installation_id > 0),
  pull_request_number integer NOT NULL CHECK (pull_request_number > 0),
  pull_request_url text NOT NULL,
  head_branch text NOT NULL,
  head_revision text NOT NULL CHECK (char_length(head_revision) = 40),
  base_branch text NOT NULL,
  pull_request_state text NOT NULL CHECK (pull_request_state IN ('open', 'closed')),
  pull_request_draft boolean NOT NULL,
  pull_request_merged boolean NOT NULL,
  reconciliation_status text NOT NULL CHECK (reconciliation_status IN ('matched', 'diverged')),
  differences text[] NOT NULL,
  observed_at timestamptz NOT NULL,
  CHECK (
    (reconciliation_status = 'matched' AND cardinality(differences) = 0)
    OR (reconciliation_status = 'diverged' AND cardinality(differences) > 0)
  )
);`;

const COLUMNS = `delivery_id, run_id, action, repository, installation_id,
  pull_request_number, pull_request_url, head_branch, head_revision, base_branch,
  pull_request_state, pull_request_draft, pull_request_merged, reconciliation_status,
  differences, observed_at`;
const INSERT_SQL = `
INSERT INTO run_github_delivery_observations (${COLUMNS})
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::timestamptz)
ON CONFLICT DO NOTHING
RETURNING ${COLUMNS};`;
const SELECT_SQL = `SELECT ${COLUMNS} FROM run_github_delivery_observations
WHERE delivery_id = $1;`;

/**
 * Creates atomic, immutable Postgres persistence for GitHub delivery observations.
 *
 * @param {{ connectionString?: string, pool?: object }} [options] Connection or injected pool.
 * @returns {Promise<object>} Observation persistence operations.
 */
export async function createPostgresDeliveryObservationStore(options = {}) {
  const pool = options.pool ?? await createPool(options.connectionString);
  let schemaPromise;
  const ensureSchema = async () => {
    schemaPromise ??= pool.query(SCHEMA_SQL);
    await schemaPromise;
  };

  return Object.freeze({
    get: async (deliveryId) => {
      await ensureSchema();
      const result = await pool.query(SELECT_SQL, [deliveryId]);
      return result.rows[0] === undefined ? null : mapObservation(result.rows[0]);
    },
    saveObservation: async (observation) => {
      await ensureSchema();
      const result = await pool.query(INSERT_SQL, observationValues(observation));
      if (result.rows[0] !== undefined) {
        return Object.freeze({ status: "created", observation: mapObservation(result.rows[0]) });
      }
      const existing = await pool.query(SELECT_SQL, [observation.deliveryId]);
      return existing.rows[0] === undefined
        ? Object.freeze({ status: "conflict", observation: null })
        : Object.freeze({ status: "existing", observation: mapObservation(existing.rows[0]) });
    },
    close: async () => pool.end(),
  });
}

/** Loads Postgres only for a concrete runtime connection. */
async function createPool(connectionString) {
  const { default: pg } = await import("pg");
  return new pg.Pool({ connectionString });
}

/** Maps one flat database row into immutable observation evidence. */
function mapObservation(row) {
  return Object.freeze({ deliveryId: row.delivery_id, runId: row.run_id, action: row.action,
    repository: row.repository, installationId: Number(row.installation_id),
    pullRequest: Object.freeze({ number: row.pull_request_number, url: row.pull_request_url,
      headBranch: row.head_branch, headRevision: row.head_revision, baseBranch: row.base_branch,
      state: row.pull_request_state, draft: row.pull_request_draft,
      merged: row.pull_request_merged }),
    reconciliation: Object.freeze({ status: row.reconciliation_status,
      differences: Object.freeze([...row.differences]) }),
    observedAt: new Date(row.observed_at).toISOString() });
}

/** Creates stable parameter order without interpolating observation evidence. */
function observationValues(observation) {
  return [observation.deliveryId, observation.runId, observation.action, observation.repository,
    observation.installationId, observation.pullRequest.number, observation.pullRequest.url,
    observation.pullRequest.headBranch, observation.pullRequest.headRevision,
    observation.pullRequest.baseBranch, observation.pullRequest.state,
    observation.pullRequest.draft, observation.pullRequest.merged,
    observation.reconciliation.status, observation.reconciliation.differences,
    observation.observedAt];
}
