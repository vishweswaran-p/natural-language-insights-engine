import { Pool } from 'pg';

// Shared PostgreSQL connection. A single pg Pool is created lazily from
// DATABASE_URL and reused across infrastructure code. Domain and application
// layers never import this — only outbound adapters do.

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set. Copy backend/.env.example to backend/.env and configure it.');
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

// Closes the shared pool (used during graceful shutdown).
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
