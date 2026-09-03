import type { Job, JobStatus, JobType } from '@app/features/dataset/application/domain/job';

// Public API representation of a job. Excludes payload/result (internal detail).
export interface JobDto {
  id: string;
  type: JobType;
  status: JobStatus;
  datasetId: string;
  attemptCount: number;
  maxAttempts: number;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export function toJobDto(job: Job): JobDto {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    datasetId: job.datasetId,
    attemptCount: job.attemptCount,
    maxAttempts: job.maxAttempts,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt ? job.startedAt.toISOString() : null,
    completedAt: job.completedAt ? job.completedAt.toISOString() : null,
  };
}
