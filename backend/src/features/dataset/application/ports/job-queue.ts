// Port: submission of asynchronous work (e.g. dataset profiling). Deliberately
// backend-agnostic — no Redis/BullMQ assumptions baked in yet.

export interface JobQueue {
  enqueue(jobName: string, payload: unknown): Promise<void>;
}
