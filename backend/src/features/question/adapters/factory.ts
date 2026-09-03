import { getPool } from '@app/shared/persistence/postgres/postgres-client';
import { makeDatasetQuery } from '@app/features/dataset/adapters/factory';
import type { LlmProvider } from '@app/features/question/application/ports/llm-provider';
import { AskQuestionUseCase } from '@app/features/question/application/use-cases/ask-question.use-case';
import { GetQuestionUseCase } from '@app/features/question/application/use-cases/get-question.use-case';
import { ListQuestionsUseCase } from '@app/features/question/application/use-cases/list-questions.use-case';
import { OpenAiCompatibleLlmProvider } from '@app/features/question/adapters/outbound/llm/openai-compatible-llm-provider';
import { resolveLlmConfig } from '@app/features/question/adapters/outbound/llm/llm-config';
import { PgQuestionCommand } from '@app/features/question/adapters/outbound/persistence/commands/pg-question-command';
import { PgQuestionQuery } from '@app/features/question/adapters/outbound/persistence/queries/pg-question-query';

// Composition root for the question feature. Concrete adapters are built here only.

const questionCommand = (): PgQuestionCommand => new PgQuestionCommand(getPool());
const questionQuery = (): PgQuestionQuery => new PgQuestionQuery(getPool());

// The active LLM adapter, chosen from the environment. Swapping providers is an
// env change; nothing else in the feature is aware of OpenAI/Ollama.
export const makeLlmProvider = (): LlmProvider => new OpenAiCompatibleLlmProvider(resolveLlmConfig());

export function makeAskQuestionUseCase(): AskQuestionUseCase {
  return new AskQuestionUseCase(makeDatasetQuery(), questionCommand());
}

export function makeListQuestionsUseCase(): ListQuestionsUseCase {
  return new ListQuestionsUseCase(questionQuery());
}

export function makeGetQuestionUseCase(): GetQuestionUseCase {
  return new GetQuestionUseCase(questionQuery());
}
