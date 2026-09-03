import type { Dataset } from '../../../application/domain/dataset';
import type { DatasetMetadata } from '../../../application/domain/dataset-metadata';
import type { DatasetStatus } from '../../../application/domain/dataset-status';

// Public API representation of a dataset. Deliberately excludes `storagePath`,
// which is an internal implementation detail.
export interface DatasetDto {
  id: string;
  filename: string;
  fileSizeBytes: number;
  mimeType: string;
  status: DatasetStatus;
  metadata: DatasetMetadata | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toDatasetDto(dataset: Dataset): DatasetDto {
  return {
    id: dataset.id,
    filename: dataset.filename,
    fileSizeBytes: dataset.fileSizeBytes,
    mimeType: dataset.mimeType,
    status: dataset.status,
    metadata: dataset.metadata,
    errorMessage: dataset.errorMessage,
    createdAt: dataset.createdAt.toISOString(),
    updatedAt: dataset.updatedAt.toISOString(),
  };
}
