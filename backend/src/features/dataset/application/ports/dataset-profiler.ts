import type { DatasetMetadata } from '../domain/dataset-metadata';

// Port: profiles a stored dataset file and produces its schema/statistics
// metadata. Later implemented via DuckDB.

export interface DatasetProfiler {
  profile(filePath: string, filename: string): Promise<DatasetMetadata>;
}
