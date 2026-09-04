import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Pool } from 'pg';
import { getLogger } from '@app/shared/logging';

const log = getLogger('database');

// Idempotent schema initialization from SQL files (not a migration framework).

export async function initializeDatabase(pool: Pool, schemaFiles: readonly string[]): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const file of schemaFiles) {
      const sql = await readFile(file, 'utf8');
      await client.query(sql);
    }
    await client.query('COMMIT');
    log.info('Database schema ready', { applied: schemaFiles.map((f) => path.basename(f)) });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
