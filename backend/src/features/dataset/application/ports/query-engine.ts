import type { Primitive } from '../domain/dataset-metadata';

// Port: executes analytical SQL against a stored dataset. Later implemented via
// DuckDB. Signatures are kept minimal for now.

export interface QueryResult {
  columns: string[];
  rows: Primitive[][];
}

export interface QueryEngine {
  run(datasetPath: string, sql: string): Promise<QueryResult>;
}
