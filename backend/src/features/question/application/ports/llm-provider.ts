import type { ColumnType, Primitive } from '@app/features/dataset/application/domain/dataset-metadata';
import type { LlmUsage } from '@app/features/question/application/domain/question';

// Outbound port for the LLM. The question layer depends only on this interface,
// never on OpenAI/Ollama/HTTP details — so switching or adding a provider is an
// adapter change with no ripple into the application or domain. This is the seam
// the hexagonal architecture buys us.

// Compact schema handed to the model for grounding (the CSV is exposed as a
// single table). Derived from a dataset's profiled metadata.
export interface DatasetSchema {
  table: string;
  rowCount: number;
  columns: { name: string; type: ColumnType }[];
}

// Result of asking the model to turn a question into SQL. It either produces a
// query or declines (`answerable = false`) when the question cannot be answered
// from the available columns. `usage` is always reported for cost/observability.
export interface SqlGeneration {
  answerable: boolean;
  sql: string | null;
  refusalReason: string | null;
  usage: LlmUsage;
}

// A natural-language restatement of an already-computed result set.
export interface Summary {
  text: string;
  usage: LlmUsage;
}

export interface LlmProvider {
  // Identifier of the active provider/model (recorded on each question).
  readonly name: string;

  generateSql(input: { question: string; schema: DatasetSchema }): Promise<SqlGeneration>;

  summarize(input: { question: string; columns: string[]; rows: Primitive[][] }): Promise<Summary>;
}
