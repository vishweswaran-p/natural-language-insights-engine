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

// Concrete adapters for the question feature.

const questionCommand = (): PgQuestionCommand => new PgQuestionCommand(getPool());
const questionQuery = (): PgQuestionQuery => new PgQuestionQuery(getPool());

const makeLlmProvider = (): LlmProvider => new OpenAiCompatibleLlmProvider(resolveLlmConfig());
const makeQueryEngine = (): QueryEngine => new DuckDbQueryEngine();

export function makeAskQuestionUseCase(): AskQuestionUseCase {
  return new AskQuestionUseCase(makeDatasetQuery(), questionCommand(), makeJobQueue());
}

export function makeListQuestionsUseCase(): ListQuestionsUseCase {
  return new ListQuestionsUseCase(questionQuery());
}

export function makeGetQuestionUseCase(): GetQuestionUseCase {
  return new GetQuestionUseCase(questionQuery());
}

export function makeQueryJobProcessor(): QueryJobProcessor {
  return new QueryJobProcessor(questionQuery(), questionCommand(), makeDatasetQuery(), makeLlmProvider(), makeQueryEngine());
}
