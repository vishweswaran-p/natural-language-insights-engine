import { getPool } from '@app/shared/persistence/postgres/postgres-client';
import { makeDatasetQuery } from '@app/features/dataset/adapters/factory';
import { AskQuestionUseCase } from '@app/features/question/application/use-cases/ask-question.use-case';
import { GetQuestionUseCase } from '@app/features/question/application/use-cases/get-question.use-case';
import { ListQuestionsUseCase } from '@app/features/question/application/use-cases/list-questions.use-case';
import { PgQuestionCommand } from '@app/features/question/adapters/outbound/persistence/commands/pg-question-command';
import { PgQuestionQuery } from '@app/features/question/adapters/outbound/persistence/queries/pg-question-query';

// Composition root for the question feature. Concrete adapters are built here only.

const questionCommand = (): PgQuestionCommand => new PgQuestionCommand(getPool());
const questionQuery = (): PgQuestionQuery => new PgQuestionQuery(getPool());

export function makeAskQuestionUseCase(): AskQuestionUseCase {
  return new AskQuestionUseCase(makeDatasetQuery(), questionCommand());
}

export function makeListQuestionsUseCase(): ListQuestionsUseCase {
  return new ListQuestionsUseCase(questionQuery());
}

export function makeGetQuestionUseCase(): GetQuestionUseCase {
  return new GetQuestionUseCase(questionQuery());
}
