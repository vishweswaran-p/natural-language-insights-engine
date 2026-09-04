import { type Job, JobType } from '@app/features/dataset/application/domain/job';
import type { DatasetQuery } from '@app/features/dataset/application/ports/dataset.query';
import { type JobProcessor, ProcessingError } from '@app/features/dataset/application/worker/job-processor';
import type { LlmUsage } from '@app/features/question/application/domain/question';
import { GuardrailError, validateReadOnlySql } from '@app/features/question/application/guardrails/sql-guardrail';
import type { DatasetSchema, LlmProvider } from '@app/features/question/application/ports/llm-provider';
import type { QueryEngine } from '@app/features/question/application/ports/query-engine';
import type { QuestionCommand } from '@app/features/question/application/ports/question.command';
import type { QuestionQuery } from '@app/features/question/application/ports/question.query';
import { getLogger } from '@app/shared/logging';

const log = getLogger('query-processor');

// Client-safe message. Real error details are logged, never persisted/returned.
const SAFE_ERROR_MESSAGE = 'Failed to answer the question.';

// Processes QUERY jobs via ports only: LLM → guardrail → query engine → summary.
// A refusal (unanswerable, or rejected by the guardrail) is a normal outcome —
// the job completes and the question is marked REFUSED, never retried.
export class QueryJobProcessor implements JobProcessor {
  constructor(
    private readonly questionQuery: QuestionQuery,
    private readonly questionCommand: QuestionCommand,
    private readonly datasetQuery: DatasetQuery,
    private readonly llmFactory: () => LlmProvider,
    private readonly queryEngine: QueryEngine,
  ) {}

  supports(type: JobType): boolean {
    return type === JobType.Query;
  }

  async process(job: Job): Promise<void> {
    const questionId = questionIdOf(job);
    if (!questionId) {
      throw new ProcessingError(SAFE_ERROR_MESSAGE, { cause: new Error(`Job ${job.id} has no questionId payload`) });
    }

    const question = await this.questionQuery.findById(questionId);
    if (!question) {
      throw new ProcessingError(SAFE_ERROR_MESSAGE, { cause: new Error(`Question ${questionId} not found for job ${job.id}`) });
    }

    const dataset = await this.datasetQuery.findById(job.datasetId);
    if (!dataset || !dataset.metadata) {
      throw new ProcessingError(SAFE_ERROR_MESSAGE, {
        cause: new Error(`Dataset ${job.datasetId} is not available/ready for question ${questionId}`),
      });
    }

    const schema: DatasetSchema = {
      table: 'dataset',
      rowCount: dataset.metadata.dataset.rowCount,
      columns: dataset.metadata.columns.map((c) => ({ name: c.name, type: c.type })),
    };

    const llm = this.llmFactory();
    log.info('Answering question', {
      jobId: job.id,
      questionId,
      datasetId: dataset.id,
      datasetFilename: dataset.filename,
      llm: llm.name,
      question: truncate(question.question, 120),
      rowCount: schema.rowCount,
      columnCount: schema.columns.length,
    });
    const startedAt = Date.now();

    // 1. Question -> SQL (or an explicit refusal).
    let generation;
    try {
      generation = await llm.generateSql({ question: question.question, schema });
    } catch (err) {
      log.error('LLM SQL generation failed', { jobId: job.id, questionId, err });
      throw new ProcessingError(SAFE_ERROR_MESSAGE, { cause: err });
    }

    log.info('SQL generation completed', {
      jobId: job.id,
      questionId,
      answerable: generation.answerable,
      sql: generation.sql ? truncate(generation.sql, 200) : null,
      ...usageFields(generation.usage),
    });

    if (!generation.answerable || !generation.sql) {
      const reason = generation.refusalReason ?? 'The question cannot be answered from this dataset.';
      await this.questionCommand.markRefused(questionId, reason, generation.usage);
      log.info('Question refused by LLM', { jobId: job.id, questionId, reason, ...usageFields(generation.usage) });
      return;
    }

    // 2. Guardrail — reject (not run) anything that is not a single read-only SELECT.
    let sql: string;
    try {
      sql = validateReadOnlySql(generation.sql);
    } catch (err) {
      if (err instanceof GuardrailError) {
        await this.questionCommand.markRefused(questionId, err.message, generation.usage);
        log.warn('Question refused by SQL guardrail', {
          jobId: job.id,
          questionId,
          reason: err.message,
          sql: truncate(generation.sql, 200),
        });
        return;
      }
      throw new ProcessingError(SAFE_ERROR_MESSAGE, { cause: err });
    }

    log.debug('SQL passed guardrail', { jobId: job.id, questionId, sql: truncate(sql, 200) });

    // 3. Execute against the real data — the answer is grounded in these rows.
    let result;
    const queryStartedAt = Date.now();
    try {
      result = await this.queryEngine.run(dataset.storagePath, sql);
    } catch (err) {
      log.error('Query execution failed', { jobId: job.id, questionId, sql: truncate(sql, 200), err });
      throw new ProcessingError(SAFE_ERROR_MESSAGE, { cause: err });
    }

    log.info('Query executed', {
      jobId: job.id,
      questionId,
      rowCount: result.rows.length,
      columns: result.columns,
      durationMs: Date.now() - queryStartedAt,
    });

    // 4. Summarize the result rows (best-effort; a summary failure must not lose the answer).
    let usage = generation.usage;
    let summary: string;
    try {
      const summarized = await llm.summarize({ question: question.question, columns: result.columns, rows: result.rows });
      summary = summarized.text;
      usage = combineUsage(generation.usage, summarized.usage);
      log.info('Summary generated', { jobId: job.id, questionId, ...usageFields(summarized.usage) });
    } catch (err) {
      log.warn('Summary generation failed; continuing with row count only', { jobId: job.id, questionId, err });
      summary = `Returned ${result.rows.length} row(s).`;
    }

    await this.questionCommand.markAnswered(questionId, {
      generatedSql: sql,
      answer: { columns: result.columns, rows: result.rows, rowCount: result.rows.length, summary },
      usage,
    });

    log.info('Question answered', {
      jobId: job.id,
      questionId,
      datasetId: dataset.id,
      rowCount: result.rows.length,
      durationMs: Date.now() - startedAt,
      ...usageFields(usage),
    });
  }

  async onTerminalFailure(job: Job, errorMessage: string): Promise<void> {
    const questionId = questionIdOf(job);
    if (questionId) {
      await this.questionCommand.markFailed(questionId, errorMessage);
      log.error('Question marked FAILED after terminal job failure', { jobId: job.id, questionId, errorMessage });
    }
  }
}

function questionIdOf(job: Job): string | null {
  const payload = job.payload as { questionId?: unknown } | null;
  return payload && typeof payload.questionId === 'string' ? payload.questionId : null;
}

function combineUsage(a: LlmUsage, b: LlmUsage): LlmUsage {
  const add = (x: number | null, y: number | null): number | null =>
    x === null && y === null ? null : (x ?? 0) + (y ?? 0);
  return {
    provider: a.provider,
    model: a.model,
    promptTokens: add(a.promptTokens, b.promptTokens),
    completionTokens: add(a.completionTokens, b.completionTokens),
    totalTokens: add(a.totalTokens, b.totalTokens),
    estimatedCostUsd: add(a.estimatedCostUsd, b.estimatedCostUsd),
    latencyMs: add(a.latencyMs, b.latencyMs),
  };
}

function usageFields(usage: LlmUsage) {
  return {
    llmProvider: usage.provider,
    llmModel: usage.model,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    estimatedCostUsd: usage.estimatedCostUsd,
    llmLatencyMs: usage.latencyMs,
  };
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max)}…`;
}
