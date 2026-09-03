-- Natural-language questions asked against a dataset, plus their answer/refusal
-- and the LLM provenance we track for cost + observability.
-- Idempotent: safe to run on every backend startup.

CREATE TABLE IF NOT EXISTS questions (
  id                 UUID PRIMARY KEY,
  dataset_id         UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  question           TEXT NOT NULL,
  status             TEXT NOT NULL CHECK (status IN ('PROCESSING', 'ANSWERED', 'REFUSED', 'FAILED')),

  -- Outcome (exactly one branch is populated once processing finishes).
  generated_sql      TEXT,           -- the SQL the LLM produced and we executed
  answer             JSONB,          -- { columns, rows, rowCount, summary }
  refusal_reason     TEXT,           -- set when status = REFUSED
  error_message      TEXT,           -- set when status = FAILED

  -- LLM provenance: cost tracking + lightweight observability.
  llm_provider       TEXT,
  llm_model          TEXT,
  prompt_tokens      INTEGER,
  completion_tokens  INTEGER,
  total_tokens       INTEGER,
  estimated_cost_usd NUMERIC(12, 6),
  latency_ms         INTEGER,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_dataset_id ON questions (dataset_id);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions (created_at);
