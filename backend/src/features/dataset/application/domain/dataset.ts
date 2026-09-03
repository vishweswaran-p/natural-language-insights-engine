import type { DatasetStatus } from '@app/features/dataset/application/domain/dataset-status';
import type { DatasetMetadata } from '@app/features/dataset/application/domain/dataset-metadata';

// Minimal Dataset entity. Only fields we are already confident about are
// included; additional business fields will be added when needed.

export interface Dataset {
  id: string;
  filename: string;
  storagePath: string;
  fileSizeBytes: number;
  mimeType: string;
  status: DatasetStatus;
  // Null while a dataset is still being processed (populated by profiling).
  metadata: DatasetMetadata | null;
  // Null unless the dataset failed processing.
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}
