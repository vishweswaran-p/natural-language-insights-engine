import { makeIngestionJobProcessor, makeJobQueue } from '@app/features/dataset/adapters/factory';
import { JobWorker } from '@app/features/dataset/application/worker/job-worker';
import { makeQueryJobProcessor } from '@app/features/question/adapters/factory';

// Cross-feature composition root for the background worker. Each feature owns its
// own processor(s); this is the single place that knows about all of them and
// assembles them onto the shared queue. Adding a new job type is one line here.
export function makeJobWorker(): JobWorker {
  return new JobWorker(makeJobQueue(), [makeIngestionJobProcessor(), makeQueryJobProcessor()]);
}
