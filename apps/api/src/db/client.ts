import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

export function createDatabase(connectionString: string) {
  // Without a timeout, a request waits forever when the database is unreachable.
  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 5_000 });
  const db = drizzle({ client: pool });
  return { pool, db };
}

export type Database = ReturnType<typeof createDatabase>['db'];
