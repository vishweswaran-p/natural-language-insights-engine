import type { Dataset } from '../domain/dataset';
import type { DatasetRepository } from '../ports/dataset-repository';

// Application service: fetch a single dataset by id (null if it does not exist).
export class GetDatasetUseCase {
  constructor(private readonly repository: DatasetRepository) {}

  exec(id: string): Promise<Dataset | null> {
    return this.repository.findById(id);
  }
}
