import type { DatasetMetadata } from './dataset-metadata';

export type DatasetStatus = 'PROCESSING' | 'READY' | 'FAILED';

// Public dataset shape returned by the API. No internal fields (e.g. storagePath).
export interface Dataset {
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
