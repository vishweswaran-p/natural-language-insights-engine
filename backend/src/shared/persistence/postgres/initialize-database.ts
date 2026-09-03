import { readFile } from 'node:fs/promises';
import type { Pool } from 'pg';

// Minimal, idempotent schema initialization. Executes the given SQL files in
// order inside a single transaction. Each .sql file must itself be idempotent
// (e.g. CREATE TABLE/INDEX IF NOT EXISTS) so restarts are safe. This is
// intentionally NOT a migration framework.

export async function initializeDatabase(pool: Pool, schemaFiles: readonly string[]): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const file of schemaFiles) {
      const sql = await readFile(file, 'utf8');
      await client.query(sql);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
