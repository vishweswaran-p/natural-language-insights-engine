-- Initial datasets persistence table.
-- Idempotent: safe to run on every backend startup.

CREATE TABLE IF NOT EXISTS datasets (
  id              UUID PRIMARY KEY,
  filename        TEXT NOT NULL,
  storage_path    TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type       TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('PROCESSING', 'READY', 'FAILED')),
  metadata        JSONB,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- List datasets newest-first (GET /api/datasets).
CREATE INDEX IF NOT EXISTS idx_datasets_created_at ON datasets (created_at DESC);
