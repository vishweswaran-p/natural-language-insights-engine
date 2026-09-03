import type { Question } from '@app/features/question/application/domain/question';
import type { QuestionQuery } from '@app/features/question/application/ports/question.query';

// Fetch a single question by id (null if it does not exist).
export class GetQuestionUseCase {
  constructor(private readonly questions: QuestionQuery) {}

  exec(id: string): Promise<Question | null> {
    return this.questions.findById(id);
  }
}
