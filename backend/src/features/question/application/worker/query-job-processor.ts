import { type Job, JobType } from '@app/features/dataset/application/domain/job';
import type { DatasetQuery } from '@app/features/dataset/application/ports/dataset.query';
import { type JobProcessor, ProcessingError } from '@app/features/dataset/application/worker/job-processor';
import type { LlmUsage } from '@app/features/question/application/domain/question';
import { GuardrailError, validateReadOnlySql } from '@app/features/question/application/guardrails/sql-guardrail';
import type { DatasetSchema, LlmProvider } from '@app/features/question/application/ports/llm-provider';
import type { QueryEngine } from '@app/features/question/application/ports/query-engine';
import type { QuestionCommand } from '@app/features/question/application/ports/question.command';
import type { QuestionQuery } from '@app/features/question/application/ports/question.query';

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
    private readonly llm: LlmProvider,
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

    // eslint-disable-next-line no-console
    console.info(`Answering question ${questionId} (dataset ${dataset.id}) via ${this.llm.name}.`);
    const startedAt = Date.now();

    // 1. Question -> SQL (or an explicit refusal).
    let generation;
    try {
      generation = await this.llm.generateSql({ question: question.question, schema });
    } catch (err) {
      logError(`LLM SQL generation failed for question ${questionId}`, err);
      throw new ProcessingError(SAFE_ERROR_MESSAGE, { cause: err });
    }

    if (!generation.answerable || !generation.sql) {
      const reason = generation.refusalReason ?? 'The question cannot be answered from this dataset.';
      await this.questionCommand.markRefused(questionId, reason, generation.usage);
      // eslint-disable-next-line no-console
      console.info(`Question ${questionId} refused: ${reason}`);
      return;
    }

    // 2. Guardrail — reject (not run) anything that is not a single read-only SELECT.
    let sql: string;
    try {
      sql = validateReadOnlySql(generation.sql);
    } catch (err) {
      if (err instanceof GuardrailError) {
        await this.questionCommand.markRefused(questionId, err.message, generation.usage);
        // eslint-disable-next-line no-console
        console.info(`Question ${questionId} refused by guardrail: ${err.message}`);
        return;
      }
      throw new ProcessingError(SAFE_ERROR_MESSAGE, { cause: err });
    }

    // 3. Execute against the real data — the answer is grounded in these rows.
    let result;
    try {
      result = await this.queryEngine.run(dataset.storagePath, sql);
    } catch (err) {
      logError(`Query execution failed for question ${questionId}`, err);
      throw new ProcessingError(SAFE_ERROR_MESSAGE, { cause: err });
    }

    // 4. Summarize the result rows (best-effort; a summary failure must not lose the answer).
    let usage = generation.usage;
    let summary: string;
    try {
      const summarized = await this.llm.summarize({ question: question.question, columns: result.columns, rows: result.rows });
      summary = summarized.text;
      usage = combineUsage(generation.usage, summarized.usage);
    } catch (err) {
      logError(`Summary generation failed for question ${questionId} (continuing without it)`, err);
      summary = `Returned ${result.rows.length} row(s).`;
    }

    await this.questionCommand.markAnswered(questionId, {
      generatedSql: sql,
      answer: { columns: result.columns, rows: result.rows, rowCount: result.rows.length, summary },
      usage,
    });

    // eslint-disable-next-line no-console
    console.info(`Question ${questionId} answered in ${Date.now() - startedAt}ms (${result.rows.length} rows).`);
  }

  async onTerminalFailure(job: Job, errorMessage: string): Promise<void> {
    const questionId = questionIdOf(job);
    if (questionId) await this.questionCommand.markFailed(questionId, errorMessage);
  }
}

function questionIdOf(job: Job): string | null {
  const payload = job.payload as { questionId?: unknown } | null;
  return payload && typeof payload.questionId === 'string' ? payload.questionId : null;
}

// Aggregate token/cost/latency across the SQL-generation and summary calls.
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

function logError(message: string, err: unknown): void {
  // eslint-disable-next-line no-console
  console.error(message, err instanceof Error ? err.message : err);
}
