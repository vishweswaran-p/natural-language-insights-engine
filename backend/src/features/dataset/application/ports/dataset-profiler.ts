import type { DatasetMetadata } from '../domain/dataset-metadata';

// Port: profiles a stored dataset file and produces its schema/statistics
// metadata. The contract is pure domain — no DuckDB, database, or Sails types.
// Implemented by an infrastructure adapter (DuckDbDatasetProfiler).

export interface ProfileDatasetInput {
  // Internal, controlled storage path of the uploaded file (adapter-only concern).
  storagePath: string;
  // Original filename, recorded in the resulting metadata.
  filename: string;
}

export interface DatasetProfiler {
  profile(input: ProfileDatasetInput): Promise<DatasetMetadata>;
}
