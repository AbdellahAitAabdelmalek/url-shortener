import { eq } from 'drizzle-orm';
import type { Database } from '../db/client';
import { type LinkRow, links } from '../db/schema';

export interface LinksRepository {
  /** Returns null when the code or the original URL is already taken. */
  insert(link: { code: string; originalUrl: string }): Promise<LinkRow | null>;
  findByCode(code: string): Promise<LinkRow | null>;
  findByOriginalUrl(originalUrl: string): Promise<LinkRow | null>;
}

export function createLinksRepository(db: Database): LinksRepository {
  return {
    async insert(link) {
      // ON CONFLICT DO NOTHING RETURNING: a conflict returns no row instead of throwing. Without
      // a target, it covers both unique constraints (code and original_url).
      const [row] = await db.insert(links).values(link).onConflictDoNothing().returning();
      return row ?? null;
    },

    async findByCode(code) {
      const [row] = await db.select().from(links).where(eq(links.code, code)).limit(1);
      return row ?? null;
    },

    async findByOriginalUrl(originalUrl) {
      const [row] = await db
        .select()
        .from(links)
        .where(eq(links.originalUrl, originalUrl))
        .limit(1);
      return row ?? null;
    },
  };
}
