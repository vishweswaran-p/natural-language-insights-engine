import type { Job, JobType } from '@app/features/dataset/application/domain/job';

// Asynchronous job queue behavior expressed as intent, not storage. Adapters
// (e.g. PgJobQueue) own SQL/locking; swapping in SQS/BullMQ is an adapter change.

export interface EnqueueJobInput {
  type: JobType;
  datasetId: string;
  payload?: unknown;
  maxAttempts?: number;
}

export interface JobQueue {
  // Add a new job in QUEUED state.
  enqueue(input: EnqueueJobInput): Promise<Job>;

  // Atomically claim the next runnable job, marking it RUNNING and incrementing
  // its attempt count. Returns null when nothing is available. Concurrency-safe.
  claimNext(): Promise<Job | null>;

  // Mark a job COMPLETED (optionally recording a result).
  complete(jobId: string, result?: unknown): Promise<Job>;

  // Record a failed attempt. The queue applies the retry policy and returns the
  // resulting job: QUEUED again if attempts remain, otherwise terminal FAILED.
  recordFailure(jobId: string, errorMessage: string): Promise<Job>;

  // Requeue/fail jobs stuck in RUNNING since before `staleBefore` (e.g. after a
  // crash). Returns the jobs it transitioned so callers can react to terminal ones.
  recoverStaleJobs(staleBefore: Date): Promise<Job[]>;

  // Read a job (for status endpoints). Null if it does not exist.
  findById(id: string): Promise<Job | null>;
}
