import type { Pool } from 'pg';
import type { LlmUsage, Question } from '@app/features/question/application/domain/question';
import type { AnsweredResult, NewQuestion, QuestionCommand } from '@app/features/question/application/ports/question.command';
import { QUESTION_COLUMNS, toQuestion } from '@app/features/question/adapters/outbound/persistence/question-row';

// Write adapter for questions (parameterized queries only). Owns the questions table.
export class PgQuestionCommand implements QuestionCommand {
  constructor(private readonly pool: Pool) {}

  async create(question: NewQuestion): Promise<Question> {
    const { rows } = await this.pool.query(
      `INSERT INTO questions (id, dataset_id, question, status)
       VALUES ($1, $2, $3, 'PROCESSING')
       RETURNING ${QUESTION_COLUMNS}`,
      [question.id, question.datasetId, question.question],
    );
    return toQuestion(rows[0]);
  }

  async markAnswered(id: string, result: AnsweredResult): Promise<void> {
    const u = result.usage;
    await this.pool.query(
      `UPDATE questions
       SET status = 'ANSWERED', generated_sql = $2, answer = $3, refusal_reason = NULL, error_message = NULL,
           llm_provider = $4, llm_model = $5, prompt_tokens = $6, completion_tokens = $7, total_tokens = $8,
           estimated_cost_usd = $9, latency_ms = $10, updated_at = NOW()
       WHERE id = $1`,
      [id, result.generatedSql, result.answer, u.provider, u.model, u.promptTokens, u.completionTokens, u.totalTokens, u.estimatedCostUsd, u.latencyMs],
    );
  }

  async markRefused(id: string, reason: string, usage: LlmUsage | null, generatedSql: string | null = null): Promise<void> {
    await this.pool.query(
      `UPDATE questions
       SET status = 'REFUSED', refusal_reason = $2, generated_sql = $3, error_message = NULL,
           llm_provider = $4, llm_model = $5, prompt_tokens = $6, completion_tokens = $7, total_tokens = $8,
           estimated_cost_usd = $9, latency_ms = $10, updated_at = NOW()
       WHERE id = $1`,
      [id, reason, generatedSql, usage?.provider ?? null, usage?.model ?? null, usage?.promptTokens ?? null, usage?.completionTokens ?? null, usage?.totalTokens ?? null, usage?.estimatedCostUsd ?? null, usage?.latencyMs ?? null],
    );
  }

  async saveGeneration(id: string, generatedSql: string, usage: LlmUsage): Promise<void> {
    await this.pool.query(
      `UPDATE questions
       SET generated_sql = $2,
           llm_provider = $3, llm_model = $4, prompt_tokens = $5, completion_tokens = $6, total_tokens = $7,
           estimated_cost_usd = $8, latency_ms = $9, updated_at = NOW()
       WHERE id = $1`,
      [id, generatedSql, usage.provider, usage.model, usage.promptTokens, usage.completionTokens, usage.totalTokens, usage.estimatedCostUsd, usage.latencyMs],
    );
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.pool.query(`UPDATE questions SET status = 'FAILED', error_message = $2, updated_at = NOW() WHERE id = $1`, [
      id,
      errorMessage,
    ]);
  }
}
