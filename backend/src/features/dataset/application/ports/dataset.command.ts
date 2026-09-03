import type { Dataset } from '@app/features/dataset/application/domain/dataset';
import type { DatasetMetadata } from '@app/features/dataset/application/domain/dataset-metadata';

// Write side of dataset persistence.
export interface DatasetCommand {
  create(dataset: Dataset): Promise<Dataset>;
  markReady(id: string, metadata: DatasetMetadata): Promise<void>;
  markFailed(id: string, errorMessage: string): Promise<void>;
}
