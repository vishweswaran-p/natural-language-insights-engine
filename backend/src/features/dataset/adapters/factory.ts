import { getPool } from '@app/shared/persistence/postgres/postgres-client';
import { CreateDatasetUseCase } from '@app/features/dataset/application/use-cases/create-dataset.use-case';
import { GetDatasetUseCase } from '@app/features/dataset/application/use-cases/get-dataset.use-case';
import { GetJobUseCase } from '@app/features/dataset/application/use-cases/get-job.use-case';
import { ListDatasetsUseCase } from '@app/features/dataset/application/use-cases/list-datasets.use-case';
import { IngestionJobProcessor } from '@app/features/dataset/application/worker/ingestion-job-processor';
import { JobWorker } from '@app/features/dataset/application/worker/job-worker';
import { PgJobQueue } from '@app/features/dataset/adapters/outbound/jobs/pg-job-queue';
import { PgDatasetCommand } from '@app/features/dataset/adapters/outbound/persistence/commands/pg-dataset-command';
import { PgDatasetQuery } from '@app/features/dataset/adapters/outbound/persistence/queries/pg-dataset-query';
import { DuckDbDatasetProfiler } from '@app/features/dataset/adapters/outbound/profiling/duckdb-dataset-profiler';
import { LocalFileStorage } from '@app/features/dataset/adapters/outbound/storage/local-file-storage';

// The single place where concrete adapters are built and injected. Routes and
// application code never `new` an adapter. The pg Pool is shared; adapters are stateless.

const datasetCommand = (): PgDatasetCommand => new PgDatasetCommand(getPool());
const jobQueue = (): PgJobQueue => new PgJobQueue(getPool());
const storage = (): LocalFileStorage => new LocalFileStorage();
const profiler = (): DuckDbDatasetProfiler => new DuckDbDatasetProfiler();

// Read side of datasets, reused by other features (e.g. question answering).
export const makeDatasetQuery = (): PgDatasetQuery => new PgDatasetQuery(getPool());

export function makeCreateDatasetUseCase(): CreateDatasetUseCase {
  return new CreateDatasetUseCase(datasetCommand(), storage(), jobQueue());
}

export function makeListDatasetsUseCase(): ListDatasetsUseCase {
  return new ListDatasetsUseCase(makeDatasetQuery());
}

export function makeGetDatasetUseCase(): GetDatasetUseCase {
  return new GetDatasetUseCase(makeDatasetQuery());
}

export function makeGetJobUseCase(): GetJobUseCase {
  return new GetJobUseCase(jobQueue());
}

export function makeJobWorker(): JobWorker {
  const ingestion = new IngestionJobProcessor(makeDatasetQuery(), datasetCommand(), profiler());
  return new JobWorker(jobQueue(), [ingestion]);
}
