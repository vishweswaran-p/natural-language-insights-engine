import type { LlmUsage, Question, QuestionAnswer } from '@app/features/question/application/domain/question';

// A newly-asked question, before any processing.
export interface NewQuestion {
  id: string;
  datasetId: string;
  question: string;
}

export interface AnsweredResult {
  generatedSql: string;
  answer: QuestionAnswer;
  usage: LlmUsage;
}

// Write side of question persistence. The status transitions are the only way a
// question moves out of PROCESSING.
export interface QuestionCommand {
  create(question: NewQuestion): Promise<Question>;
  markAnswered(id: string, result: AnsweredResult): Promise<void>;
  markRefused(id: string, reason: string, usage: LlmUsage | null, generatedSql?: string | null): Promise<void>;
  saveGeneration(id: string, generatedSql: string, usage: LlmUsage): Promise<void>;
  markFailed(id: string, errorMessage: string): Promise<void>;
}
