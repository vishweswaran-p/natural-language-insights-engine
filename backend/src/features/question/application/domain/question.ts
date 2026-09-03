import type { Primitive } from '@app/features/dataset/application/domain/dataset-metadata';

// Natural-language question asked against a dataset. Framework/persistence agnostic.

export const QuestionStatus = {
  Processing: 'PROCESSING', // queued/running
  Answered: 'ANSWERED', // SQL generated, executed, answer available
  Refused: 'REFUSED', // unanswerable from the data or rejected by guardrails (not an error)
  Failed: 'FAILED', // unexpected processing error
} as const;

export type QuestionStatus = (typeof QuestionStatus)[keyof typeof QuestionStatus];

// What a successful run produced. The result table is the ground truth; `summary`
// is a natural-language restatement derived only from those rows.
export interface QuestionAnswer {
  columns: string[];
  rows: Primitive[][];
  rowCount: number;
  summary: string;
}

// LLM provenance for a question: cost tracking + lightweight observability.
// Token/cost fields are null when a provider does not report them.
export interface LlmUsage {
  provider: string;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
  latencyMs: number | null;
}

export interface Question {
  id: string;
  datasetId: string;
  question: string;
  status: QuestionStatus;
  generatedSql: string | null;
  answer: QuestionAnswer | null;
  refusalReason: string | null;
  errorMessage: string | null;
  usage: LlmUsage | null;
  createdAt: Date;
  updatedAt: Date;
}
