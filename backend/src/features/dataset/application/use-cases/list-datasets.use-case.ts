import type { Dataset } from '@app/features/dataset/application/domain/dataset';
import type { DatasetQuery } from '@app/features/dataset/application/ports/dataset.query';

// List datasets, newest first (ordering owned by the query adapter).
export class ListDatasetsUseCase {
  constructor(private readonly datasets: DatasetQuery) {}

  exec(): Promise<Dataset[]> {
    return this.datasets.list();
  }
}
