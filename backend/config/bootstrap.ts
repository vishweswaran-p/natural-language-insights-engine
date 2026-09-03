import { datasetSchemaFiles } from '../src/features/dataset/adapters/outbound/persistence/schema';
import { getPool } from '../src/shared/persistence/postgres/postgres-client';
import { initializeDatabase } from '../src/shared/persistence/postgres/initialize-database';

// Sails runs this once during `lift`, before the server accepts requests.
// We connect to PostgreSQL and ensure the schema exists. Any failure is passed
// to `done(err)` so lift aborts loudly rather than starting an unusable backend.

export = {
  bootstrap: async function bootstrap(done: (err?: Error) => void): Promise<void> {
    try {
      const pool = getPool();
      await initializeDatabase(pool, datasetSchemaFiles);
      return done();
    } catch (err) {
      return done(err instanceof Error ? err : new Error(String(err)));
    }
  },
};
