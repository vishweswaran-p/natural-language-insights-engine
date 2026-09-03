import type { Job } from '@app/features/dataset/application/domain/job';
import type { JobQueue } from '@app/features/dataset/application/ports/job-queue';

// Application service: fetch a single job by id (null if it does not exist).
export class GetJobUseCase {
  constructor(private readonly jobQueue: JobQueue) {}

  exec(id: string): Promise<Job | null> {
    return this.jobQueue.findById(id);
  }
}
