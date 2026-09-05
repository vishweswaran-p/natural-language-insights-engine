import type { Primitive } from '@app/features/dataset/application/domain/dataset-metadata';
import type { DatasetSchema } from '@app/features/question/application/ports/llm-provider';
import { formatSchemaForPrompt } from '@app/features/question/application/sql-schema-context';

const MAX_SUMMARY_ROWS = 50;

export function buildGenerateSqlPrompt(question: string, schema: DatasetSchema): string {
  return `${formatSchemaForPrompt(schema)}\n\n<question>\n${question}\n</question>`;
}

export function buildSqlRepairPrompt(
  question: string,
  schema: DatasetSchema,
  failedSql: string,
  errorMessage: string,
): string {
  return [
    formatSchemaForPrompt(schema),
    '',
    '<question>',
    question,
    '</question>',
    '',
    'The SQL below failed in DuckDB. Return corrected SQL for the same question.',
    'Fix only what is needed; keep the query read-only and valid DuckDB.',
    '',
    '<failed_sql>',
    failedSql,
    '</failed_sql>',
    '',
    '<duckdb_error>',
    errorMessage.slice(0, 1500),
    '</duckdb_error>',
  ].join('\n');
}

export function buildSummarizePrompt(question: string, columns: string[], rows: Primitive[][]): string {
  const preview = rows.slice(0, MAX_SUMMARY_ROWS);
  return [
    `Question: ${question}`,
    `Result columns: ${JSON.stringify(columns)}`,
    `Rows (JSON, up to ${MAX_SUMMARY_ROWS}): ${JSON.stringify(preview)}`,
    'Write a short natural-language answer.',
  ].join('\n');
}
