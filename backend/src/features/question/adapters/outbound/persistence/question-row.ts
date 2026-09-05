import type { QueryResultRow } from 'pg';
import type { LlmUsage, Question, QuestionAnswer, QuestionStatus } from '@app/features/question/application/domain/question';

// Column list and row -> domain mapping shared by the question query/command adapters.

export const QUESTION_COLUMNS =
  'id, dataset_id, question, status, generated_sql, generate_sql_prompt, summarize_prompt, answer, refusal_reason, error_message, ' +
  'llm_provider, llm_model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, ' +
  'created_at, updated_at';

export function toQuestion(row: QueryResultRow): Question {
  return {
    id: row.id,
    datasetId: row.dataset_id,
    question: row.question,
    status: row.status as QuestionStatus,
    generatedSql: row.generated_sql ?? null,
    generateSqlPrompt: row.generate_sql_prompt ?? null,
    summarizePrompt: row.summarize_prompt ?? null,
    answer: (row.answer as QuestionAnswer | null) ?? null,
    refusalReason: row.refusal_reason ?? null,
    errorMessage: row.error_message ?? null,
    usage: toUsage(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Usage is only meaningful once a provider has been recorded; otherwise null.
function toUsage(row: QueryResultRow): LlmUsage | null {
  if (!row.llm_provider) return null;
  return {
    provider: row.llm_provider,
    model: row.llm_model,
    promptTokens: toNumberOrNull(row.prompt_tokens),
    completionTokens: toNumberOrNull(row.completion_tokens),
    totalTokens: toNumberOrNull(row.total_tokens),
    estimatedCostUsd: toNumberOrNull(row.estimated_cost_usd), // NUMERIC arrives as string
    latencyMs: toNumberOrNull(row.latency_ms),
  };
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(n) ? null : n;
}
