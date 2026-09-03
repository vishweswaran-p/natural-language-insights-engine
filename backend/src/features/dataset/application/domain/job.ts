// Background job domain model. Framework/persistence agnostic.
//
// Only INGESTION exists today; the shape leaves room for QUERY (etc.) later
// without changing the queue/worker contracts.

export const JobType = {
  Ingestion: 'INGESTION',
} as const;

export type JobType = (typeof JobType)[keyof typeof JobType];

export const JobStatus = {
  Queued: 'QUEUED',
  Running: 'RUNNING',
  Completed: 'COMPLETED',
  Failed: 'FAILED',
} as const;

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  datasetId: string;
  payload: unknown | null;
  result: unknown | null;
  errorMessage: string | null;
  attemptCount: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  updatedAt: Date;
}
