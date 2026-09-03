// Mirrors the backend JobDto. Both dataset ingestion and question answering flow
// through the same background job queue.

export type JobType = 'INGESTION' | 'QUERY';

export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface Job {
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
