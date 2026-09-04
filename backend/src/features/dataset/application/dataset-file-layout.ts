import path from 'node:path';

// Controlled on-disk layout for a stored dataset. Paths are always derived from
// the application-generated dataset id — never from the user-provided filename.

export const DATASET_CSV_FILENAME = 'original.csv';
export const DATASET_PARQUET_FILENAME = 'data.parquet';

export function parquetPathFor(csvStoragePath: string): string {
  return path.join(path.dirname(csvStoragePath), DATASET_PARQUET_FILENAME);
}
