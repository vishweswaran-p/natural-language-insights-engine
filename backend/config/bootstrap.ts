import { schemaFiles } from '@app/composition/schema';
import { makeJobWorker } from '@app/composition/worker';
import type { JobWorker } from '@app/features/dataset/application/worker/job-worker';
import { getLogger } from '@app/shared/logging';
import { closePool, getPool } from '@app/shared/persistence/postgres/postgres-client';
import { initializeDatabase } from '@app/shared/persistence/postgres/initialize-database';
import { onShutdown } from '@app/shared/runtime/graceful-shutdown';

const log = getLogger('bootstrap');

// Sails runs this once during `lift`, before the server accepts requests. We
// connect to PostgreSQL and ensure the schema exists. The background worker runs
// in-process by default, but can be moved to its own process (see `worker.ts`) by
// setting RUN_WORKER_IN_API=false and running `npm run worker` separately.

let worker: JobWorker | undefined;

export = {
  bootstrap: async function bootstrap(done: (err?: Error) => void): Promise<void> {
    try {
      const pool = getPool();
      await initializeDatabase(pool, schemaFiles);

      if (runWorkerInApi()) {
        worker = makeJobWorker();
        worker.start();
      } else {
        log.info('In-process job worker disabled; run the standalone worker separately', {
          hint: 'npm --prefix backend run worker',
        });
      }

      onShutdown(async () => {
        await worker?.stop();
        await closePool();
      });
      return done();
    } catch (err) {
      return done(err instanceof Error ? err : new Error(String(err)));
    }
  },
};

// Defaults to true so a single `npm start` runs a fully working backend.
function runWorkerInApi(): boolean {
  return process.env.RUN_WORKER_IN_API !== 'false';
}
