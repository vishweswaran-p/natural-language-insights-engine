import type { Dataset } from '../domain/dataset';
import type { DatasetMetadata } from '../domain/dataset-metadata';

// Write side of dataset persistence.
export interface DatasetCommand {
  create(dataset: Dataset): Promise<Dataset>;
  markReady(id: string, metadata: DatasetMetadata): Promise<void>;
  markFailed(id: string, errorMessage: string): Promise<void>;
}
