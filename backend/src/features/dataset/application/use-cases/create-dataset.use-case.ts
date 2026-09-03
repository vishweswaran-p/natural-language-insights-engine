import { randomUUID } from 'node:crypto';
import type { Dataset } from '../domain/dataset';
import { DatasetStatus } from '../domain/dataset-status';
import type { DatasetRepository } from '../ports/dataset-repository';
import type { FileStorage } from '../ports/file-storage';

// Validated upload details handed in by the inbound adapter.
export interface CreateDatasetInput {
  filename: string;
  fileSizeBytes: number;
  mimeType: string;
  // Temporary path of the received upload; moved into controlled storage here.
  sourcePath: string;
}

// Application service: persist an uploaded dataset. No profiling happens yet —
// the dataset intentionally stays in PROCESSING until a later phase.
export class CreateDatasetUseCase {
  constructor(
    private readonly repository: DatasetRepository,
    private readonly storage: FileStorage,
  ) {}

  async exec(input: CreateDatasetInput): Promise<Dataset> {
    const id = randomUUID();
    const { storagePath } = await this.storage.store({ datasetId: id, sourcePath: input.sourcePath });

    const now = new Date();
    const dataset: Dataset = {
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

    try {
      return await this.repository.create(dataset);
    } catch (err) {
      // Compensating cleanup: the file was stored but the DB insert failed.
      // Best-effort — a failing cleanup must not mask the original error.
      await this.storage.remove(id).catch((cleanupErr) => {
        // eslint-disable-next-line no-console
        console.error(`Failed to clean up stored file for dataset ${id}`, cleanupErr);
      });
      throw err;
    }
  }
}
