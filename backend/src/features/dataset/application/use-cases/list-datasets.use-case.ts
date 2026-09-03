import type { Dataset } from '../domain/dataset';
import type { DatasetQuery } from '../ports/dataset.query';

// List datasets, newest first (ordering owned by the query adapter).
export class ListDatasetsUseCase {
  constructor(private readonly datasets: DatasetQuery) {}

  exec(): Promise<Dataset[]> {
    return this.datasets.list();
  }
}
