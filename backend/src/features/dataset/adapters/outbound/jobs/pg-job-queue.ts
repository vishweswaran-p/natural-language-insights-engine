import { randomUUID } from 'node:crypto';
import type { Pool, QueryResultRow } from 'pg';
import type { Job, JobStatus, JobType } from '../../../application/domain/job';
import type { EnqueueJobInput, JobQueue } from '../../../application/ports/job-queue';

// PostgreSQL-backed JobQueue. The only place that knows the jobs table exists:
// SQL, row locking, attempt counting, and stale recovery all live here. It never
// touches the datasets table.

const COLUMNS =
  'id, type, status, dataset_id, payload, result, error_message, attempt_count, max_attempts, started_at, completed_at, created_at, updated_at';

export class PgJobQueue implements JobQueue {
  constructor(private readonly pool: Pool) {}

  async enqueue(input: EnqueueJobInput): Promise<Job> {
    const { rows } = await this.pool.query(
      `INSERT INTO jobs (id, type, status, dataset_id, payload, max_attempts)
       VALUES ($1, $2, 'QUEUED', $3, $4, COALESCE($5, 3))
       RETURNING ${COLUMNS}`,
      [randomUUID(), input.type, input.datasetId, input.payload ?? null, input.maxAttempts ?? null],
    );
    return toJob(rows[0]);
  }

  // Lock the oldest QUEUED row with FOR UPDATE SKIP LOCKED so concurrent workers
  // never claim the same job, then flip it to RUNNING.
  async claimNext(): Promise<Job | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const selected = await client.query(
        `SELECT id FROM jobs WHERE status = 'QUEUED' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`,
      );
      if (selected.rows.length === 0) {
        await client.query('COMMIT');
        return null;
      }
      const { rows } = await client.query(
        `UPDATE jobs SET status = 'RUNNING', started_at = NOW(), attempt_count = attempt_count + 1, updated_at = NOW()
         WHERE id = $1 RETURNING ${COLUMNS}`,
        [selected.rows[0].id],
      );
      await client.query('COMMIT');
      return toJob(rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async complete(jobId: string, result?: unknown): Promise<Job> {
    const { rows } = await this.pool.query(
      `UPDATE jobs SET status = 'COMPLETED', result = $2, error_message = NULL, completed_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING ${COLUMNS}`,
      [jobId, result ?? null],
    );
    return toJob(rows[0]);
  }

  // Requeue while attempts remain, otherwise mark FAILED. attempt_count was
  // already incremented at claim time.
  async recordFailure(jobId: string, errorMessage: string): Promise<Job> {
    const { rows } = await this.pool.query(
      `UPDATE jobs
       SET status        = CASE WHEN attempt_count < max_attempts THEN 'QUEUED' ELSE 'FAILED' END,
           error_message = $2,
           started_at    = CASE WHEN attempt_count < max_attempts THEN NULL ELSE started_at END,
           completed_at  = CASE WHEN attempt_count < max_attempts THEN NULL ELSE NOW() END,
           updated_at    = NOW()
       WHERE id = $1 RETURNING ${COLUMNS}`,
      [jobId, errorMessage],
    );
    return toJob(rows[0]);
  }

  // Requeue/fail RUNNING jobs stuck since before `staleBefore`. Returns the
  // affected jobs so the caller can react to terminal ones.
  async recoverStaleJobs(staleBefore: Date): Promise<Job[]> {
    const { rows } = await this.pool.query(
      `UPDATE jobs
       SET status        = CASE WHEN attempt_count < max_attempts THEN 'QUEUED' ELSE 'FAILED' END,
           error_message = CASE WHEN attempt_count < max_attempts THEN error_message ELSE 'Job timed out.' END,
           started_at    = CASE WHEN attempt_count < max_attempts THEN NULL ELSE started_at END,
           completed_at  = CASE WHEN attempt_count < max_attempts THEN NULL ELSE NOW() END,
           updated_at    = NOW()
       WHERE status = 'RUNNING' AND started_at < $1 RETURNING ${COLUMNS}`,
      [staleBefore],
    );
    return rows.map(toJob);
  }

  async findById(id: string): Promise<Job | null> {
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM jobs WHERE id = $1`, [id]);
    return rows[0] ? toJob(rows[0]) : null;
  }
}

function toJob(row: QueryResultRow): Job {
  return {
    id: row.id,
    type: row.type as JobType,
    status: row.status as JobStatus,
    datasetId: row.dataset_id,
    payload: row.payload ?? null,
    result: row.result ?? null,
    errorMessage: row.error_message ?? null,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    createdAt: row.created_at,
    startedAt: row.started_at ?? null,
    completedAt: row.completed_at ?? null,
    updatedAt: row.updated_at,
  };
}
