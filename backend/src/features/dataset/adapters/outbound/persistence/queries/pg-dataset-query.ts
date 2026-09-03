import type { Pool } from 'pg';
import type { Dataset } from '../../../../application/domain/dataset';
import type { DatasetQuery } from '../../../../application/ports/dataset.query';
import { DATASET_COLUMNS, toDataset } from '../dataset-row';

// Read adapter for datasets (parameterized queries only).
export class PgDatasetQuery implements DatasetQuery {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<Dataset | null> {
    const { rows } = await this.pool.query(`SELECT ${DATASET_COLUMNS} FROM datasets WHERE id = $1`, [id]);
    return rows[0] ? toDataset(rows[0]) : null;
  }

  async list(): Promise<Dataset[]> {
    const { rows } = await this.pool.query(`SELECT ${DATASET_COLUMNS} FROM datasets ORDER BY created_at DESC`);
    return rows.map(toDataset);
  }
}
