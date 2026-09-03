import 'dotenv/config';
import { makeJobWorker } from './src/features/dataset/adapters/factory';
import { datasetSchemaFiles } from './src/features/dataset/adapters/outbound/persistence/schema';
import { closePool, getPool } from './src/shared/persistence/postgres/postgres-client';
import { initializeDatabase } from './src/shared/persistence/postgres/initialize-database';
import { onShutdown } from './src/shared/runtime/graceful-shutdown';

// Standalone job worker: the same worker the API can run in-process, but as its
// own OS process. It shares no port with the API — coordination happens purely
// through the PostgreSQL job queue, so any number of these can run alongside the
// API (and each other) safely.
async function main(): Promise<void> {
  const pool = getPool();
  await initializeDatabase(pool, datasetSchemaFiles);

  const worker = makeJobWorker();
  worker.start();

  onShutdown(async () => {
    await worker.stop();
    await closePool();
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start job worker', err);
  process.exit(1);
});
