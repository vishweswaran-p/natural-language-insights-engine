import { makeIngestionJobProcessor, makeJobQueue } from '@app/features/dataset/adapters/factory';
import { JobWorker } from '@app/features/dataset/application/worker/job-worker';
import { makeQueryJobProcessor } from '@app/features/question/adapters/factory';

export function makeJobWorker(): JobWorker {
  return new JobWorker(makeJobQueue(), [makeIngestionJobProcessor(), makeQueryJobProcessor()]);
}
