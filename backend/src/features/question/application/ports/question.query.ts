import type { Question } from '@app/features/question/application/domain/question';

// Read side of question persistence.
export interface QuestionQuery {
  findById(id: string): Promise<Question | null>;
  list(): Promise<Question[]>;
}
