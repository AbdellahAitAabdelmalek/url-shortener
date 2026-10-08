import { join } from 'node:path';
import { runMigrations } from '../db/migrate';
import { TEST_DATABASE_URL } from './config';

/** Runs once before all test files: brings the test database schema up to date. */
export default async function setup() {
  await runMigrations(TEST_DATABASE_URL, join(import.meta.dirname, '../../drizzle'));
}
