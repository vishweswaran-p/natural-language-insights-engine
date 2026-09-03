import type { Dataset } from '../domain/dataset';

// Read side of dataset persistence.
export interface DatasetQuery {
  findById(id: string): Promise<Dataset | null>;
  list(): Promise<Dataset[]>;
}
