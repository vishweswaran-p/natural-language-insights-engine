import type { Dataset } from '@app/features/dataset/application/domain/dataset';

// Read side of dataset persistence.
export interface DatasetQuery {
  findById(id: string): Promise<Dataset | null>;
  list(): Promise<Dataset[]>;
}
