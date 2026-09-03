import { type Job, JobType } from '../domain/job';
import type { DatasetCommand } from '../ports/dataset.command';
import type { DatasetProfiler } from '../ports/dataset-profiler';
import type { DatasetQuery } from '../ports/dataset.query';
import { type JobProcessor, ProcessingError } from './job-processor';

// Client-safe message. Real error details are logged, never persisted/returned.
const SAFE_ERROR_MESSAGE = 'Dataset profiling failed.';

// Processes INGESTION jobs via ports only — no DuckDB, SQL, or filesystem knowledge.
export class IngestionJobProcessor implements JobProcessor {
  constructor(
    private readonly datasetQuery: DatasetQuery,
    private readonly datasetCommand: DatasetCommand,
    private readonly profiler: DatasetProfiler,
  ) {}

  supports(type: JobType): boolean {
    return type === JobType.Ingestion;
  }

  async process(job: Job): Promise<void> {
    const dataset = await this.datasetQuery.findById(job.datasetId);
    if (!dataset) {
      throw new ProcessingError(SAFE_ERROR_MESSAGE, {
        cause: new Error(`Dataset ${job.datasetId} not found for ingestion job ${job.id}`),
      });
    }

    // eslint-disable-next-line no-console
    console.info(`Profiling started for dataset ${dataset.id} (${dataset.filename}).`);
    const startedAt = Date.now();

    let metadata;
    try {
      metadata = await this.profiler.profile({ storagePath: dataset.storagePath, filename: dataset.filename });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        `Profiling failed for dataset ${dataset.id} after ${Date.now() - startedAt}ms:`,
        err instanceof Error ? err.message : err,
      );
      throw new ProcessingError(SAFE_ERROR_MESSAGE, { cause: err });
    }

    // Persisted only on a fully successful profile — never partial metadata.
    await this.datasetCommand.markReady(dataset.id, metadata);

    // eslint-disable-next-line no-console
    console.info(
      `Profiling completed for dataset ${dataset.id}: ${metadata.dataset.rowCount} rows, ` +
        `${metadata.dataset.columnCount} columns in ${Date.now() - startedAt}ms.`,
    );
  }

  async onTerminalFailure(job: Job, errorMessage: string): Promise<void> {
    await this.datasetCommand.markFailed(job.datasetId, errorMessage);
  }
}
