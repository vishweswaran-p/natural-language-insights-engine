import type { Pool, QueryResultRow } from 'pg';
import type { Dataset } from '../../../application/domain/dataset';
import type { DatasetStatus } from '../../../application/domain/dataset-status';
import type { DatasetMetadata } from '../../../application/domain/dataset-metadata';
import type { DatasetRepository } from '../../../application/ports/dataset-repository';

// Outbound adapter: PostgreSQL implementation of DatasetRepository.
// - parameterized queries only (no string concatenation of values)
// - maps snake_case rows to the camelCase domain model
// - never leaks raw pg rows out of this adapter

const COLUMNS =
  'id, filename, storage_path, file_size_bytes, mime_type, status, metadata, error_message, created_at, updated_at';

export class PostgresDatasetRepository implements DatasetRepository {
  constructor(private readonly pool: Pool) {}

  async create(dataset: Dataset): Promise<Dataset> {
    // created_at / updated_at are left to the table defaults (NOW()) and read back.
    const result = await this.pool.query(
      `INSERT INTO datasets (id, filename, storage_path, file_size_bytes, mime_type, status, metadata, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${COLUMNS}`,
      [
        dataset.id,
        dataset.filename,
        dataset.storagePath,
        dataset.fileSizeBytes,
        dataset.mimeType,
        dataset.status,
        dataset.metadata,
        dataset.errorMessage,
      ],
    );
    return toDataset(result.rows[0]);
  }

  async findById(id: string): Promise<Dataset | null> {
    const result = await this.pool.query(`SELECT ${COLUMNS} FROM datasets WHERE id = $1`, [id]);
    const row = result.rows[0];
    return row ? toDataset(row) : null;
  }

  async list(): Promise<Dataset[]> {
    const result = await this.pool.query(`SELECT ${COLUMNS} FROM datasets ORDER BY created_at DESC`);
    return result.rows.map(toDataset);
  }
}

// Explicit row -> domain mapper. Keeps the persistence shape contained here.
function toDataset(row: QueryResultRow): Dataset {
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

// BIGINT is returned by the pg driver as a string. Upload sizes comfortably fit
// in a JS number for this app; guard against silent precision loss regardless.
function toSafeNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(n)) {
    throw new Error(`file_size_bytes out of safe integer range: ${String(value)}`);
  }
  return n;
}
