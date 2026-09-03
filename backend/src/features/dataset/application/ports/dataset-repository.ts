import type { Dataset } from '../domain/dataset';

// Port: persistence of datasets lives behind this interface. Intentionally not
// a generic CRUD repository — only the operations we know we need so far.
// Concrete adapters (e.g. Postgres) will implement this under adapters/outbound.

export interface DatasetRepository {
  save(dataset: Dataset): Promise<void>;
  findById(id: string): Promise<Dataset | null>;
}
