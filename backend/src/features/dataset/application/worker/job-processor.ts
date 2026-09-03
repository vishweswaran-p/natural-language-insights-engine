import type { Job, JobType } from '../domain/job';

// Raised by a processor for an expected failure. `safeMessage` is client-safe and
// is what gets persisted/returned; the underlying `internalCause` is logged, never exposed.
export class ProcessingError extends Error {
  readonly internalCause?: unknown;

  constructor(safeMessage: string, options?: { cause?: unknown }) {
    super(safeMessage);
    this.name = 'ProcessingError';
    this.internalCause = options?.cause;
  }

  get safeMessage(): string {
    return this.message;
  }
}

// A processor handles one kind of job. The worker dispatches to the first
// processor that `supports` the job's type. Kept intentionally tiny — no plugin
// registry, decorators, or reflection.

export interface JobProcessor {
  supports(type: JobType): boolean;

  // Do the work. Throwing signals failure; the worker + queue decide retry/terminal.
  // An optional return value is stored as the job result.
  process(job: Job): Promise<unknown | void>;

  // Called only when a job has failed terminally, so the processor can apply any
  // domain-side consequences (e.g. marking the dataset FAILED). Optional.
  onTerminalFailure?(job: Job, errorMessage: string): Promise<void>;
}
