import type { ColumnType, Primitive, TopValue } from '@app/features/dataset/application/domain/dataset-metadata';
import type { LlmUsage } from '@app/features/question/application/domain/question';

// Outbound port for text-to-SQL and summarization.
export interface SchemaColumn {
  name: string;
  type: ColumnType;
  sampleValues: Primitive[];
  nullPercentage: number;
  distinctCount?: number;
  topValues?: TopValue[];
  stats?: { min?: Primitive; max?: Primitive };
}

export interface DatasetSchema {
  table: string;
  rowCount: number;
  columns: SchemaColumn[];
  warnings: string[];
}

// Result of asking the model to turn a question into SQL.
export interface SqlGeneration {
  answerable: boolean;
  sql: string | null;
  refusalReason: string | null;
  usage: LlmUsage;
  generateSqlPrompt: string | null;
}

// A natural-language restatement of an already-computed result set.
export interface Summary {
  text: string;
  usage: LlmUsage;
  summarizePrompt: string;
}

export interface LlmProvider {
  // Identifier of the active provider/model (recorded on each question).
  readonly name: string;

  generateSql(input: { question: string; schema: DatasetSchema }): Promise<SqlGeneration>;

  repairSql(input: {
    question: string;
    schema: DatasetSchema;
    failedSql: string;
    errorMessage: string;
  }): Promise<SqlGeneration>;

  summarize(input: { question: string; columns: string[]; rows: Primitive[][] }): Promise<Summary>;
}
