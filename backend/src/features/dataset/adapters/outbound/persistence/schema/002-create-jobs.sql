-- Background job queue table (INGESTION profiles a dataset; QUERY answers a question).
-- Idempotent: safe to run on every backend startup.

CREATE TABLE IF NOT EXISTS jobs (
  id            UUID PRIMARY KEY,
  type          TEXT NOT NULL CHECK (type IN ('INGESTION', 'QUERY')),
  status        TEXT NOT NULL CHECK (status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED')),
  dataset_id    UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  payload       JSONB,
  result        JSONB,
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts  INTEGER NOT NULL DEFAULT 3,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Claim the oldest QUEUED job (worker poll).
CREATE INDEX IF NOT EXISTS idx_jobs_status_created_at ON jobs (status, created_at);

-- FK lookups when a dataset is deleted (ON DELETE CASCADE).
CREATE INDEX IF NOT EXISTS idx_jobs_dataset_id ON jobs (dataset_id);

-- Stale-job recovery: RUNNING jobs older than a threshold.
CREATE INDEX IF NOT EXISTS idx_jobs_running_started_at ON jobs (started_at) WHERE status = 'RUNNING';
