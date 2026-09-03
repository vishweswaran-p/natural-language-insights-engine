import { DuckDBInstance } from '@duckdb/node-api';
import type { Primitive } from '@app/features/dataset/application/domain/dataset-metadata';
import type { QueryEngine, QueryResult } from '@app/features/question/application/ports/query-engine';

// Executes read-only SQL over a stored CSV via an in-memory DuckDB connection.
// The CSV is exposed as a lazily-scanned view named `dataset`: DuckDB streams
// the file per query rather than loading it fully into memory, so large files
// stay memory-safe. (Swapping read_csv_auto for read_parquet here is all it
// would take to query a columnar copy instead.)

const MAX_RESULT_ROWS = 1000; // bound the payload; aggregations are tiny, raw SELECTs may not be

export class DuckDbQueryEngine implements QueryEngine {
  async run(datasetPath: string, sql: string): Promise<QueryResult> {
    const instance = await DuckDBInstance.create(':memory:');
    const connection = await instance.connect();
    try {
      await connection.run(
        `CREATE OR REPLACE TEMP VIEW dataset AS SELECT * FROM read_csv_auto(${quoteLiteral(datasetPath)}, header = true)`,
      );

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
