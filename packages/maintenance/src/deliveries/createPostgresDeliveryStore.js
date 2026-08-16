const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS run_pull_request_deliveries (
  run_id text PRIMARY KEY,
  installation_id bigint NOT NULL CHECK (installation_id > 0),
  repository text NOT NULL,
  issue_number integer NOT NULL CHECK (issue_number > 0),
  base_branch text NOT NULL,
  branch_name text NOT NULL,
  head_revision text NOT NULL CHECK (char_length(head_revision) = 40),
  base_revision text NOT NULL CHECK (char_length(base_revision) = 40),
  diff_hash text NOT NULL CHECK (char_length(diff_hash) = 64),
  plan_version integer NOT NULL CHECK (plan_version > 0),
  verification_status text NOT NULL CHECK (verification_status = 'passed'),
  verification_evidence_hash text NOT NULL CHECK (char_length(verification_evidence_hash) = 64),
  pull_request_number integer NOT NULL CHECK (pull_request_number > 0),
  pull_request_url text NOT NULL,
  pull_request_draft boolean NOT NULL CHECK (pull_request_draft),
  delivered_at timestamptz NOT NULL,
  UNIQUE (repository, branch_name),
  UNIQUE (repository, pull_request_number)
);`;

const COLUMNS = `run_id, installation_id, repository, issue_number, base_branch, branch_name,
  head_revision, base_revision, diff_hash, plan_version, verification_status,
  verification_evidence_hash, pull_request_number, pull_request_url, pull_request_draft, delivered_at`;
const INSERT_SQL = `
INSERT INTO run_pull_request_deliveries (${COLUMNS})
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::timestamptz)
ON CONFLICT DO NOTHING
RETURNING ${COLUMNS};`;
const SELECT_SQL = `SELECT ${COLUMNS} FROM run_pull_request_deliveries WHERE run_id = $1;`;
const SELECT_BY_PULL_REQUEST_SQL = `SELECT ${COLUMNS} FROM run_pull_request_deliveries
WHERE repository = $1 AND pull_request_number = $2;`;

/**
 * Creates atomic Postgres persistence for completed pull-request deliveries.
 *
 * @param {{ connectionString?: string, pool?: object }} [options] Connection or injected pool.
 * @returns {Promise<object>} Delivery persistence operations.
 */
export async function createPostgresDeliveryStore(options = {}) {
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
      return result.rows[0] === undefined ? null : mapDelivery(result.rows[0]);
    },
    getByPullRequest: async (repository, pullRequestNumber) => {
      await ensureSchema();
      const result = await pool.query(SELECT_BY_PULL_REQUEST_SQL, [repository, pullRequestNumber]);
      return result.rows[0] === undefined ? null : mapDelivery(result.rows[0]);
    },
    saveDelivery: async (delivery) => {
      await ensureSchema();
      const result = await pool.query(INSERT_SQL, deliveryValues(delivery));
      if (result.rows[0] !== undefined) {
        return Object.freeze({ status: "created", delivery: mapDelivery(result.rows[0]) });
      }
      const existing = await pool.query(SELECT_SQL, [delivery.runId]);
      return existing.rows[0] === undefined
        ? Object.freeze({ status: "conflict", delivery: null })
        : Object.freeze({ status: "existing", delivery: mapDelivery(existing.rows[0]) });
    },
    close: async () => pool.end(),
  });
}

/** Loads Postgres only for a concrete runtime connection. */
async function createPool(connectionString) {
  const { default: pg } = await import("pg");
  return new pg.Pool({ connectionString });
}

/** Maps one flat database row into immutable domain delivery evidence. */
function mapDelivery(row) {
  return Object.freeze({ runId: row.run_id, installationId: Number(row.installation_id),
    repository: row.repository, issueNumber: row.issue_number, baseBranch: row.base_branch,
    branchName: row.branch_name, headRevision: row.head_revision,
    proposalBinding: Object.freeze({ baseRevision: row.base_revision, diffHash: row.diff_hash,
      planVersion: row.plan_version, verification: Object.freeze({ status: row.verification_status,
        evidenceHash: row.verification_evidence_hash }) }),
    pullRequest: Object.freeze({ number: row.pull_request_number, url: row.pull_request_url,
      draft: row.pull_request_draft }), deliveredAt: new Date(row.delivered_at).toISOString() });
}

/** Creates stable parameter order without interpolating delivery evidence. */
function deliveryValues(delivery) {
  return [delivery.runId, delivery.installationId, delivery.repository, delivery.issueNumber,
    delivery.baseBranch, delivery.branchName, delivery.headRevision,
    delivery.proposalBinding.baseRevision, delivery.proposalBinding.diffHash,
    delivery.proposalBinding.planVersion, delivery.proposalBinding.verification.status,
    delivery.proposalBinding.verification.evidenceHash, delivery.pullRequest.number,
    delivery.pullRequest.url, delivery.pullRequest.draft, delivery.deliveredAt];
}
