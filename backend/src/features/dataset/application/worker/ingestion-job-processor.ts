import { type Job, JobType } from '@app/features/dataset/application/domain/job';
import type { DatasetCommand } from '@app/features/dataset/application/ports/dataset.command';
import type { DatasetProfiler } from '@app/features/dataset/application/ports/dataset-profiler';
import type { DatasetQuery } from '@app/features/dataset/application/ports/dataset.query';
import { type JobProcessor, ProcessingError } from '@app/features/dataset/application/worker/job-processor';
import { getLogger } from '@app/shared/logging';

const log = getLogger('ingestion-processor');

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

    log.info('Profiling started', {
      jobId: job.id,
      datasetId: dataset.id,
      filename: dataset.filename,
      fileSizeBytes: dataset.fileSizeBytes,
    });
    const startedAt = Date.now();

    let metadata;
    try {
      metadata = await this.profiler.profile({ storagePath: dataset.storagePath, filename: dataset.filename });
    } catch (err) {
      log.error('Profiling failed', {
        jobId: job.id,
        datasetId: dataset.id,
        filename: dataset.filename,
        durationMs: Date.now() - startedAt,
        err,
      });
      throw new ProcessingError(SAFE_ERROR_MESSAGE, { cause: err });
    }

    await this.datasetCommand.markReady(dataset.id, metadata);

    log.info('Profiling completed; dataset READY', {
      jobId: job.id,
      datasetId: dataset.id,
      filename: dataset.filename,
      rowCount: metadata.dataset.rowCount,
      columnCount: metadata.dataset.columnCount,
      warningCount: metadata.warnings.length,
      durationMs: Date.now() - startedAt,
    });
  }

  async onTerminalFailure(job: Job, errorMessage: string): Promise<void> {
    await this.datasetCommand.markFailed(job.datasetId, errorMessage);
    log.error('Dataset marked FAILED after terminal job failure', {
      jobId: job.id,
      datasetId: job.datasetId,
      errorMessage,
    });
  }
}
