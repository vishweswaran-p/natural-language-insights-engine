import type { DatasetStatus } from './dataset-status';
import type { DatasetMetadata } from './dataset-metadata';

// Minimal Dataset entity. Only fields we are already confident about are
// included; additional business fields will be added when needed.

export interface Dataset {
  id: string;
  filename: string;
  storagePath: string;
  status: DatasetStatus;
  metadata: DatasetMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}
