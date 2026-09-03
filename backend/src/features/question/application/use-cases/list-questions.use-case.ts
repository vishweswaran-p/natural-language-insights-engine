import type { Question } from '@app/features/question/application/domain/question';
import type { QuestionQuery } from '@app/features/question/application/ports/question.query';

// List questions, newest first (ordering owned by the query adapter).
export class ListQuestionsUseCase {
  constructor(private readonly questions: QuestionQuery) {}

  exec(): Promise<Question[]> {
    return this.questions.list();
  }
}
