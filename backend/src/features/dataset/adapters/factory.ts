import { getPool } from '../../../shared/persistence/postgres/postgres-client';
import { CreateDatasetUseCase } from '../application/use-cases/create-dataset.use-case';
import { GetDatasetUseCase } from '../application/use-cases/get-dataset.use-case';
import { GetJobUseCase } from '../application/use-cases/get-job.use-case';
import { ListDatasetsUseCase } from '../application/use-cases/list-datasets.use-case';
import { IngestionJobProcessor } from '../application/worker/ingestion-job-processor';
import { JobWorker } from '../application/worker/job-worker';
import { PgJobQueue } from './outbound/jobs/pg-job-queue';
import { PgDatasetCommand } from './outbound/persistence/commands/pg-dataset-command';
import { PgDatasetQuery } from './outbound/persistence/queries/pg-dataset-query';
import { DuckDbDatasetProfiler } from './outbound/profiling/duckdb-dataset-profiler';
import { LocalFileStorage } from './outbound/storage/local-file-storage';

// The single place where concrete adapters are built and injected. Routes and
// application code never `new` an adapter. The pg Pool is shared; adapters are stateless.

const datasetQuery = (): PgDatasetQuery => new PgDatasetQuery(getPool());
const datasetCommand = (): PgDatasetCommand => new PgDatasetCommand(getPool());
const jobQueue = (): PgJobQueue => new PgJobQueue(getPool());
const storage = (): LocalFileStorage => new LocalFileStorage();
const profiler = (): DuckDbDatasetProfiler => new DuckDbDatasetProfiler();

export function makeCreateDatasetUseCase(): CreateDatasetUseCase {
  return new CreateDatasetUseCase(datasetCommand(), storage(), jobQueue());
}

export function makeListDatasetsUseCase(): ListDatasetsUseCase {
  return new ListDatasetsUseCase(datasetQuery());
}

export function makeGetDatasetUseCase(): GetDatasetUseCase {
  return new GetDatasetUseCase(datasetQuery());
}

export function makeGetJobUseCase(): GetJobUseCase {
  return new GetJobUseCase(jobQueue());
}

export function makeJobWorker(): JobWorker {
  const ingestion = new IngestionJobProcessor(datasetQuery(), datasetCommand(), profiler());
  return new JobWorker(jobQueue(), [ingestion]);
}
