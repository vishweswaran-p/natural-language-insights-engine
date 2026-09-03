import { JobStatus } from '../domain/job';
import type { Job } from '../domain/job';
import type { JobQueue } from '../ports/job-queue';
import { type JobProcessor, ProcessingError } from './job-processor';

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
    // eslint-disable-next-line no-console
    console.info('Job worker started.');
  }

  // Stop polling and wait for the current iteration to settle.
  async stop(): Promise<void> {
    this.running = false;
    await this.loop;
    this.loop = undefined;
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
        // Never let the loop die on an unexpected error (e.g. transient DB issue).
        // eslint-disable-next-line no-console
        console.error('Job worker loop error', err);
        await sleep(this.pollIntervalMs);
      }
    }
  }

  private async handle(job: Job): Promise<void> {
    const processor = this.processors.find((p) => p.supports(job.type));
    if (!processor) {
      await this.queue.recordFailure(job.id, `No processor for job type ${job.type}.`);
      return;
    }

    try {
      const result = await processor.process(job);
      await this.queue.complete(job.id, result ?? null);
    } catch (err) {
      const safeMessage = err instanceof ProcessingError ? err.safeMessage : GENERIC_SAFE_ERROR;
      // Log full internal detail server-side (never persisted/returned to clients).
      // eslint-disable-next-line no-console
      console.error(`Job ${job.id} (${job.type}) failed`, err instanceof ProcessingError ? err.internalCause : err);

      // The queue decides retry vs terminal failure and returns the outcome.
      const outcome = await this.queue.recordFailure(job.id, safeMessage);
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
