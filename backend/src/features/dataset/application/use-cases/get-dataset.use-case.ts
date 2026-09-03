import type { Dataset } from '@app/features/dataset/application/domain/dataset';
import type { DatasetQuery } from '@app/features/dataset/application/ports/dataset.query';

// Fetch a single dataset by id (null if it does not exist).
export class GetDatasetUseCase {
  constructor(private readonly datasets: DatasetQuery) {}

  exec(id: string): Promise<Dataset | null> {
    return this.datasets.findById(id);
  }
}
