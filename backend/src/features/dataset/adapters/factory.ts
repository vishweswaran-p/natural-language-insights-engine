import { getPool } from '../../../shared/persistence/postgres/postgres-client';
import { CreateDatasetUseCase } from '../application/use-cases/create-dataset.use-case';
import { GetDatasetUseCase } from '../application/use-cases/get-dataset.use-case';
import { ListDatasetsUseCase } from '../application/use-cases/list-datasets.use-case';
import { PostgresDatasetRepository } from './outbound/persistence/postgres-dataset-repository';
import { LocalFileStorage } from './outbound/storage/local-file-storage';

// Feature composition root: the single place where concrete outbound adapters are
// constructed and injected into use-cases. Routes/use-cases never `new` adapters.
// The pg Pool and LocalFileStorage are effectively stateless/shared, so building
// per call is cheap.

function repository(): PostgresDatasetRepository {
  return new PostgresDatasetRepository(getPool());
}

function storage(): LocalFileStorage {
  return new LocalFileStorage();
}

export function makeCreateDatasetUseCase(): CreateDatasetUseCase {
  return new CreateDatasetUseCase(repository(), storage());
}

export function makeListDatasetsUseCase(): ListDatasetsUseCase {
  return new ListDatasetsUseCase(repository());
}

export function makeGetDatasetUseCase(): GetDatasetUseCase {
  return new GetDatasetUseCase(repository());
}
