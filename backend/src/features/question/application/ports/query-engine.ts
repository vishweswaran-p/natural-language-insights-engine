import type { Primitive } from '@app/features/dataset/application/domain/dataset-metadata';

// Outbound port for executing analytical SQL against a stored dataset. The
// application depends only on this interface; DuckDB (or any future engine)
// lives behind it.

export interface QueryResult {
  columns: string[];
  rows: Primitive[][];
}

export interface QueryEngine {
  // Execute a validated, read-only SQL query. The dataset is exposed to the
  // query as a table named `dataset`.
  run(datasetPath: string, sql: string): Promise<QueryResult>;
}
