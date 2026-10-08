import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabase } from './client';

/** Applies the SQL migrations that have not been applied yet, with a dedicated connection. */
export async function runMigrations(connectionString: string, migrationsFolder: string) {
  const { pool, db } = createDatabase(connectionString);
  try {
    await migrate(db, { migrationsFolder });
  } finally {
    await pool.end();
  }
}
