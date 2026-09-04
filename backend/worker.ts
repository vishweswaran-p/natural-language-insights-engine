import 'dotenv/config';
import { schemaFiles } from '@app/composition/schema';
import { makeJobWorker } from '@app/composition/worker';
import { getLogger } from '@app/shared/logging';
import { closePool, getPool } from '@app/shared/persistence/postgres/postgres-client';
import { initializeDatabase } from '@app/shared/persistence/postgres/initialize-database';
import { onShutdown } from '@app/shared/runtime/graceful-shutdown';

const log = getLogger('worker');

// Standalone job worker: the same worker the API can run in-process, but as its
// own OS process. It shares no port with the API — coordination happens purely
// through the PostgreSQL job queue, so any number of these can run alongside the
// API (and each other) safely.
async function main(): Promise<void> {
  const pool = getPool();
  await initializeDatabase(pool, schemaFiles);

  const worker = makeJobWorker();
  worker.start();
  log.info('Standalone job worker process started');

  onShutdown(async () => {
    await worker.stop();
    await closePool();
  });
}

main().catch((err) => {
  log.error('Failed to start job worker', { err });
  process.exit(1);
});
