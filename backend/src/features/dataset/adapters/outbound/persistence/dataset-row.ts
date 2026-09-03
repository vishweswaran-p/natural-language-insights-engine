import type { QueryResultRow } from 'pg';
import type { Dataset } from '../../../application/domain/dataset';
import type { DatasetStatus } from '../../../application/domain/dataset-status';
import type { DatasetMetadata } from '../../../application/domain/dataset-metadata';

// Column list and row -> domain mapping shared by the dataset query/command adapters.

export const DATASET_COLUMNS =
  'id, filename, storage_path, file_size_bytes, mime_type, status, metadata, error_message, created_at, updated_at';

export function toDataset(row: QueryResultRow): Dataset {
  return {
    id: row.id,
    filename: row.filename,
    storagePath: row.storage_path,
    fileSizeBytes: toSafeNumber(row.file_size_bytes),
    mimeType: row.mime_type,
    status: row.status as DatasetStatus,
    metadata: (row.metadata as DatasetMetadata | null) ?? null,
    errorMessage: row.error_message ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// BIGINT arrives from the pg driver as a string; guard against precision loss.
function toSafeNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(n)) throw new Error(`file_size_bytes out of safe integer range: ${String(value)}`);
  return n;
}
