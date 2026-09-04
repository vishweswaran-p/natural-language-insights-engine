import { getPool } from '@app/shared/persistence/postgres/postgres-client';
import { CreateDatasetUseCase } from '@app/features/dataset/application/use-cases/create-dataset.use-case';
import { GetDatasetUseCase } from '@app/features/dataset/application/use-cases/get-dataset.use-case';
import { GetJobUseCase } from '@app/features/dataset/application/use-cases/get-job.use-case';
import { ListDatasetsUseCase } from '@app/features/dataset/application/use-cases/list-datasets.use-case';
import { IngestionJobProcessor } from '@app/features/dataset/application/worker/ingestion-job-processor';
import { PgJobQueue } from '@app/features/dataset/adapters/outbound/jobs/pg-job-queue';
import { PgDatasetCommand } from '@app/features/dataset/adapters/outbound/persistence/commands/pg-dataset-command';
import { PgDatasetQuery } from '@app/features/dataset/adapters/outbound/persistence/queries/pg-dataset-query';
import { DuckDbDatasetProfiler } from '@app/features/dataset/adapters/outbound/profiling/duckdb-dataset-profiler';
import { LocalFileStorage } from '@app/features/dataset/adapters/outbound/storage/local-file-storage';

// Concrete adapters for the dataset feature.

const datasetCommand = (): PgDatasetCommand => new PgDatasetCommand(getPool());
const storage = (): LocalFileStorage => new LocalFileStorage();
const profiler = (): DuckDbDatasetProfiler => new DuckDbDatasetProfiler();

// Read side of datasets, reused by other features (e.g. question answering).
export const makeDatasetQuery = (): PgDatasetQuery => new PgDatasetQuery(getPool());

// Shared job queue and ingestion processor for the background worker.
export const makeJobQueue = (): PgJobQueue => new PgJobQueue(getPool());
export const makeIngestionJobProcessor = (): IngestionJobProcessor =>
  new IngestionJobProcessor(makeDatasetQuery(), datasetCommand(), profiler());

export function makeCreateDatasetUseCase(): CreateDatasetUseCase {
  return new CreateDatasetUseCase(datasetCommand(), storage(), makeJobQueue());
}

export function makeListDatasetsUseCase(): ListDatasetsUseCase {
  return new ListDatasetsUseCase(makeDatasetQuery());
}

export function makeGetDatasetUseCase(): GetDatasetUseCase {
  return new GetDatasetUseCase(makeDatasetQuery());
}

export function makeGetJobUseCase(): GetJobUseCase {
  return new GetJobUseCase(makeJobQueue());
}
