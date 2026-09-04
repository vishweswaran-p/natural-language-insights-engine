import type { ColumnType, Primitive } from '@app/features/dataset/application/domain/dataset-metadata';
import type { LlmUsage } from '@app/features/question/application/domain/question';

// Outbound port for text-to-SQL and summarization.
export interface DatasetSchema {
  table: string;
  rowCount: number;
  columns: { name: string; type: ColumnType }[];
}

// Result of asking the model to turn a question into SQL.
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
