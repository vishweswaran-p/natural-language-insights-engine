import { randomUUID } from 'node:crypto';
import type { Dataset } from '@app/features/dataset/application/domain/dataset';
import { DatasetStatus } from '@app/features/dataset/application/domain/dataset-status';
import type { Job } from '@app/features/dataset/application/domain/job';
import { JobType } from '@app/features/dataset/application/domain/job';
import type { DatasetCommand } from '@app/features/dataset/application/ports/dataset.command';
import type { FileStorage } from '@app/features/dataset/application/ports/file-storage';
import type { JobQueue } from '@app/features/dataset/application/ports/job-queue';

export interface CreateDatasetInput {
  filename: string;
  fileSizeBytes: number;
  mimeType: string;
  sourcePath: string; // temp path of the received upload
}

export interface CreateDatasetResult {
  dataset: Dataset;
  job: Job;
}

// Store the uploaded file, persist the dataset as PROCESSING, and enqueue an
// INGESTION job. Profiling happens asynchronously in the worker.
export class CreateDatasetUseCase {
  constructor(
    private readonly datasets: DatasetCommand,
    private readonly storage: FileStorage,
    private readonly jobQueue: JobQueue,
  ) {}

  async exec(input: CreateDatasetInput): Promise<CreateDatasetResult> {
    const id = randomUUID();
    const { storagePath } = await this.storage.store({ datasetId: id, sourcePath: input.sourcePath });

    const now = new Date();
    const toCreate: Dataset = {
      id,
      filename: input.filename,
      storagePath,
      fileSizeBytes: input.fileSizeBytes,
      mimeType: input.mimeType,
      status: DatasetStatus.Processing,
      metadata: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    };

    let dataset: Dataset;
    try {
      dataset = await this.datasets.create(toCreate);
    } catch (err) {
      // File was stored but the insert failed: clean it up (best-effort).
      await this.storage.remove(id).catch((cleanupErr) => {
        // eslint-disable-next-line no-console
        console.error(`Failed to clean up stored file for dataset ${id}`, cleanupErr);
      });
      throw err;
    }

    // Create + enqueue are not one DB transaction (that would couple two adapters
    // behind a shared unit-of-work). We compensate instead: if enqueue fails, mark
    // the dataset FAILED so it is never left stuck in PROCESSING.
    try {
      const job = await this.jobQueue.enqueue({ type: JobType.Ingestion, datasetId: id });
      return { dataset, job };
    } catch (err) {
      await this.datasets.markFailed(id, 'Failed to enqueue ingestion job.').catch((markErr) => {
        // eslint-disable-next-line no-console
        console.error(`Failed to mark dataset ${id} FAILED after enqueue error`, markErr);
      });
      throw err;
    }
  }
}
