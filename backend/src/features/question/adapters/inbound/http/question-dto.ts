import type { LlmUsage, Question, QuestionAnswer, QuestionStatus } from '@app/features/question/application/domain/question';

// Public API representation of a question. Includes the LLM usage so cost can be
// surfaced in the UI.
export interface QuestionDto {
  id: string;
  datasetId: string;
  question: string;
  status: QuestionStatus;
  generatedSql: string | null;
  generateSqlPrompt: string | null;
  summarizePrompt: string | null;
  answer: QuestionAnswer | null;
  refusalReason: string | null;
  errorMessage: string | null;
  usage: LlmUsage | null;
  createdAt: string;
  updatedAt: string;
}

export function toQuestionDto(question: Question): QuestionDto {
  return {
    id: question.id,
    datasetId: question.datasetId,
    question: question.question,
    status: question.status,
    generatedSql: question.generatedSql,
    generateSqlPrompt: question.generateSqlPrompt,
    summarizePrompt: question.summarizePrompt,
    answer: question.answer,
    refusalReason: question.refusalReason,
    errorMessage: question.errorMessage,
    usage: question.usage,
    createdAt: question.createdAt.toISOString(),
    updatedAt: question.updatedAt.toISOString(),
  };
}
