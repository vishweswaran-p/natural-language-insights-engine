import 'dotenv/config';
import path from 'node:path';
import { schemaFiles } from '@app/composition/schema';
import { makeJobWorker } from '@app/composition/worker';
import { resolveLlmConfig } from '@app/features/question/adapters/outbound/llm/llm-config';
import { getLogger } from '@app/shared/logging';
import { closePool, getPool } from '@app/shared/persistence/postgres/postgres-client';
import { initializeDatabase } from '@app/shared/persistence/postgres/initialize-database';
import { onShutdown } from '@app/shared/runtime/graceful-shutdown';
import { logWorkerStartupBanner } from '@app/shared/runtime/startup-banner';

const log = getLogger('worker');

// Standalone job worker: the same worker the API can run in-process, but as its
// own OS process. It shares no port with the API — coordination happens purely
// through the PostgreSQL job queue, so any number of these can run alongside the
// API (and each other) safely.
async function main(): Promise<void> {
  log.info('Starting standalone worker', { environment: process.env.NODE_ENV ?? 'development' });

  const pool = getPool();
  log.info('Connecting to PostgreSQL');
  await initializeDatabase(pool, schemaFiles);

  const worker = makeJobWorker();
  worker.start();

  const llm = resolveLlmConfig();
  logWorkerStartupBanner(log, {
    environment: process.env.NODE_ENV ?? 'development',
    llmProvider: llm.provider,
    llmModel: llm.model,
    schemaFiles: schemaFiles.map((f) => path.basename(f)),
  });

  onShutdown(async () => {
    await worker.stop();
    await closePool();
  });
}

main().catch((err) => {
  log.error('Failed to start job worker', { err });
  process.exit(1);
});
