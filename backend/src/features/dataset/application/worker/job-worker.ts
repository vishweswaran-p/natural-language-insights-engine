import { JobStatus } from '@app/features/dataset/application/domain/job';
import type { Job } from '@app/features/dataset/application/domain/job';
import type { JobQueue } from '@app/features/dataset/application/ports/job-queue';
import { type JobProcessor, ProcessingError } from '@app/features/dataset/application/worker/job-processor';
import { getLogger } from '@app/shared/logging';

const log = getLogger('job-worker');

const DEFAULT_POLL_INTERVAL_MS = 500;
const DEFAULT_STALE_AFTER_MS = 10 * 60 * 1000; // treat RUNNING jobs older than 10m as stale
const DEFAULT_STALE_SWEEP_INTERVAL_MS = 60 * 1000; // check for stale jobs once a minute
const GENERIC_SAFE_ERROR = 'Job processing failed.';

export interface JobWorkerOptions {
  pollIntervalMs?: number;
  staleAfterMs?: number;
  staleSweepIntervalMs?: number;
}

// Application-level background worker. Knows only the JobQueue port and its
// processors — no PostgreSQL, no locking details. It coordinates: claim a job,
// dispatch it, and record success/failure through the queue. When the queue
// reports a terminal failure, it lets the processor apply domain consequences.
export class JobWorker {
  private running = false;
  private loop?: Promise<void>;
  private lastStaleSweep = 0;

  private readonly pollIntervalMs: number;
  private readonly staleAfterMs: number;
  private readonly staleSweepIntervalMs: number;

  constructor(
    private readonly queue: JobQueue,
    private readonly processors: JobProcessor[],
    options: JobWorkerOptions = {},
  ) {
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.staleAfterMs = options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
    this.staleSweepIntervalMs = options.staleSweepIntervalMs ?? DEFAULT_STALE_SWEEP_INTERVAL_MS;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.loop = this.run();
    log.info('Job worker started', {
      pollIntervalMs: this.pollIntervalMs,
      staleAfterMs: this.staleAfterMs,
      processorCount: this.processors.length,
    });
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.loop;
    this.loop = undefined;
    log.info('Job worker stopped');
  }

  private async run(): Promise<void> {
    while (this.running) {
      try {
        await this.sweepStaleJobs();
        const job = await this.queue.claimNext();
        if (!job) {
          await sleep(this.pollIntervalMs);
          continue;
        }
        await this.handle(job);
      } catch (err) {
        log.error('Job worker loop error', { err });
        await sleep(this.pollIntervalMs);
      }
    }
  }

  private async handle(job: Job): Promise<void> {
    const processor = this.processors.find((p) => p.supports(job.type));
    if (!processor) {
      log.error('No processor registered for job type', { jobId: job.id, jobType: job.type });
      await this.queue.recordFailure(job.id, `No processor for job type ${job.type}.`);
      return;
    }

    const startedAt = Date.now();
    log.info('Job claimed', {
      jobId: job.id,
      jobType: job.type,
      datasetId: job.datasetId,
      attempt: job.attemptCount,
      maxAttempts: job.maxAttempts,
    });

    try {
      const result = await processor.process(job);
      await this.queue.complete(job.id, result ?? null);
      log.info('Job completed', {
        jobId: job.id,
        jobType: job.type,
        datasetId: job.datasetId,
        durationMs: Date.now() - startedAt,
      });
    } catch (err) {
      const safeMessage = err instanceof ProcessingError ? err.safeMessage : GENERIC_SAFE_ERROR;
      const internalCause = err instanceof ProcessingError ? err.internalCause : err;

      const outcome = await this.queue.recordFailure(job.id, safeMessage);
      const willRetry = outcome.status !== JobStatus.Failed;

      log.error('Job failed', {
        jobId: job.id,
        jobType: job.type,
        datasetId: job.datasetId,
        attempt: outcome.attemptCount,
        maxAttempts: outcome.maxAttempts,
        willRetry,
        safeMessage,
        durationMs: Date.now() - startedAt,
        err: internalCause,
      });

      if (outcome.status === JobStatus.Failed) {
        await processor.onTerminalFailure?.(outcome, safeMessage);
      }
    }
  }

  private async sweepStaleJobs(): Promise<void> {
    const now = Date.now();
    if (now - this.lastStaleSweep < this.staleSweepIntervalMs) return;
    this.lastStaleSweep = now;

    const recovered = await this.queue.recoverStaleJobs(new Date(now - this.staleAfterMs));
    if (recovered.length === 0) return;

    log.warn('Recovered stale jobs', {
      count: recovered.length,
      jobIds: recovered.map((j) => j.id),
    });

    for (const job of recovered) {
      if (job.status !== JobStatus.Failed) continue;
      const processor = this.processors.find((p) => p.supports(job.type));
      await processor?.onTerminalFailure?.(job, job.errorMessage ?? GENERIC_SAFE_ERROR);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
