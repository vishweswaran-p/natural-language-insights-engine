import { getPool } from '@app/shared/persistence/postgres/postgres-client';
import { makeDatasetQuery, makeJobQueue } from '@app/features/dataset/adapters/factory';
import type { LlmProvider } from '@app/features/question/application/ports/llm-provider';
import type { QueryEngine } from '@app/features/question/application/ports/query-engine';
import { AskQuestionUseCase } from '@app/features/question/application/use-cases/ask-question.use-case';
import { GetQuestionUseCase } from '@app/features/question/application/use-cases/get-question.use-case';
import { ListQuestionsUseCase } from '@app/features/question/application/use-cases/list-questions.use-case';
import { QueryJobProcessor } from '@app/features/question/application/worker/query-job-processor';
import { OpenAiCompatibleLlmProvider } from '@app/features/question/adapters/outbound/llm/openai-compatible-llm-provider';
import { resolveLlmConfig } from '@app/features/question/adapters/outbound/llm/llm-config';
import { PgQuestionCommand } from '@app/features/question/adapters/outbound/persistence/commands/pg-question-command';
import { PgQuestionQuery } from '@app/features/question/adapters/outbound/persistence/queries/pg-question-query';
import { DuckDbQueryEngine } from '@app/features/question/adapters/outbound/query/duckdb-query-engine';

// Composition root for the question feature. Concrete adapters are built here only.

const questionCommand = (): PgQuestionCommand => new PgQuestionCommand(getPool());
const questionQuery = (): PgQuestionQuery => new PgQuestionQuery(getPool());

// The active LLM adapter, chosen from the environment. Swapping providers is an
// env change; nothing else in the feature is aware of OpenAI/Ollama.
export const makeLlmProvider = (): LlmProvider => new OpenAiCompatibleLlmProvider(resolveLlmConfig());

// Executes generated SQL against the stored dataset.
export const makeQueryEngine = (): QueryEngine => new DuckDbQueryEngine();

export function makeAskQuestionUseCase(): AskQuestionUseCase {
  return new AskQuestionUseCase(makeDatasetQuery(), questionCommand(), makeJobQueue());
}

export function makeListQuestionsUseCase(): ListQuestionsUseCase {
  return new ListQuestionsUseCase(questionQuery());
}

export function makeGetQuestionUseCase(): GetQuestionUseCase {
  return new GetQuestionUseCase(questionQuery());
}

// The worker-side processor for QUERY jobs, assembled from this feature's ports.
// Registered onto the shared worker in the background composition root.
export function makeQueryJobProcessor(): QueryJobProcessor {
  return new QueryJobProcessor(questionQuery(), questionCommand(), makeDatasetQuery(), makeLlmProvider(), makeQueryEngine());
}
