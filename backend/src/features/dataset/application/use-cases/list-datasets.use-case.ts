import type { Dataset } from '../domain/dataset';
import type { DatasetRepository } from '../ports/dataset-repository';

// Application service: list datasets (newest first — ordering owned by the repo).
export class ListDatasetsUseCase {
  constructor(private readonly repository: DatasetRepository) {}

  exec(): Promise<Dataset[]> {
    return this.repository.list();
  }
}
