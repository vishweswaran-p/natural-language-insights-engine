import { access } from 'node:fs/promises';
import { DuckDBInstance } from '@duckdb/node-api';
import type { Primitive } from '@app/features/dataset/application/domain/dataset-metadata';
import { parquetPathFor } from '@app/features/dataset/application/dataset-file-layout';
import type { QueryEngine, QueryResult } from '@app/features/question/application/ports/query-engine';

// Executes read-only SQL over a stored dataset via an in-memory DuckDB connection.
// During ingestion a Parquet copy is materialized alongside the CSV; queries
// prefer that columnar file when present for faster repeated scans on large data.

const MAX_RESULT_ROWS = 1000; // bound the payload; aggregations are tiny, raw SELECTs may not be

export class DuckDbQueryEngine implements QueryEngine {
  async run(datasetPath: string, sql: string): Promise<QueryResult> {
    const instance = await DuckDBInstance.create(':memory:');
    const connection = await instance.connect();
    try {
      const source = await datasetSourceExpression(datasetPath);
      await connection.run(`CREATE OR REPLACE TEMP VIEW dataset AS SELECT * FROM ${source}`);

      // Wrap the (already guardrail-validated) query to enforce a hard row cap.
      const reader = await connection.runAndReadAll(`SELECT * FROM (${sql}) AS _q LIMIT ${MAX_RESULT_ROWS}`);
      return {
        columns: reader.columnNames(),
        rows: reader.getRows().map((row) => row.map(toPrimitive)),
      };
    } finally {
      connection.closeSync();
      instance.closeSync();
    }
  }
}

async function datasetSourceExpression(csvStoragePath: string): Promise<string> {
  const parquetPath = parquetPathFor(csvStoragePath);
  try {
    await access(parquetPath);
    return `read_parquet(${quoteLiteral(parquetPath)})`;
  } catch {
    return `read_csv_auto(${quoteLiteral(csvStoragePath)}, header = true)`;
  }
}

function toPrimitive(value: unknown): Primitive {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return Number.isSafeInteger(Number(value)) ? Number(value) : value.toString();
  if (typeof value === 'string') return value;
  return String(value); // dates/timestamps/decimals arrive as value objects
}

function quoteLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
