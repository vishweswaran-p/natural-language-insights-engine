// Mirrors the backend QuestionDto. A question is asked against a dataset and
// answered asynchronously by the worker.

export type QuestionStatus = 'PROCESSING' | 'ANSWERED' | 'REFUSED' | 'FAILED';

export type Primitive = string | number | boolean | null;

// The computed result table plus a natural-language summary of it.
export interface QuestionAnswer {
  columns: string[];
  rows: Primitive[][];
  rowCount: number;
  summary: string;
}

// LLM provenance: cost tracking + lightweight observability. Null fields when a
// provider does not report them.
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
  generateSqlPrompt: string | null;
  summarizePrompt: string | null;
  answer: QuestionAnswer | null;
  refusalReason: string | null;
  errorMessage: string | null;
  usage: LlmUsage | null;
  createdAt: string;
  updatedAt: string;
}
