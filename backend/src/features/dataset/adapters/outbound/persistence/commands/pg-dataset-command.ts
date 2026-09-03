import type { Pool } from 'pg';
import type { Dataset } from '@app/features/dataset/application/domain/dataset';
import type { DatasetMetadata } from '@app/features/dataset/application/domain/dataset-metadata';
import type { DatasetCommand } from '@app/features/dataset/application/ports/dataset.command';
import { DATASET_COLUMNS, toDataset } from '@app/features/dataset/adapters/outbound/persistence/dataset-row';

// Write adapter for datasets (parameterized queries only).
export class PgDatasetCommand implements DatasetCommand {
  constructor(private readonly pool: Pool) {}

  // created_at / updated_at come from table defaults and are read back.
  async create(dataset: Dataset): Promise<Dataset> {
    const { rows } = await this.pool.query(
      `INSERT INTO datasets (id, filename, storage_path, file_size_bytes, mime_type, status, metadata, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${DATASET_COLUMNS}`,
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
    return toDataset(rows[0]);
  }

  async markReady(id: string, metadata: DatasetMetadata): Promise<void> {
    await this.pool.query(
      `UPDATE datasets SET status = 'READY', metadata = $2, error_message = NULL, updated_at = NOW() WHERE id = $1`,
      [id, metadata],
    );
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.pool.query(`UPDATE datasets SET status = 'FAILED', error_message = $2, updated_at = NOW() WHERE id = $1`, [
      id,
      errorMessage,
    ]);
  }
}
