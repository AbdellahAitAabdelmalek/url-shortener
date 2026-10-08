// Drizzle table definitions. Migrations are generated from this file (npm run db:generate).
import { CODE_LENGTH } from '@url-shortener/shared';
import { bigint, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const links = pgTable('links', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  // The unique constraint creates the index used by redirections, and makes a code collision
  // fail at insert time instead of relying on a check-then-insert race.
  code: varchar('code', { length: CODE_LENGTH }).notNull().unique(),
  // One link per URL. URLs are normalized and capped at 2048 ASCII characters by LongUrlSchema,
  // so they fit in a B-tree index entry: no need to index a hash of the URL instead.
  originalUrl: text('original_url').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type LinkRow = typeof links.$inferSelect;
