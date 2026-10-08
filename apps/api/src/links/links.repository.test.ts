import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase } from '../db/client';
import { links } from '../db/schema';
import { TEST_DATABASE_URL } from '../test/config';
import { createLinksRepository } from './links.repository';

const { pool, db } = createDatabase(TEST_DATABASE_URL);
const repository = createLinksRepository(db);

beforeEach(async () => {
  await db.delete(links);
});

afterAll(async () => {
  await pool.end();
});

describe('LinksRepository', () => {
  it('inserts a link', async () => {
    const link = await repository.insert({ code: 'aB3xK9q', originalUrl: 'https://stoik.com' });

    expect(link).toMatchObject({ code: 'aB3xK9q', originalUrl: 'https://stoik.com' });
    expect(link?.createdAt).toBeInstanceOf(Date);
  });

  it('returns null when the code is already taken', async () => {
    await repository.insert({ code: 'aB3xK9q', originalUrl: 'https://stoik.com' });

    const duplicate = await repository.insert({
      code: 'aB3xK9q',
      originalUrl: 'https://other.com',
    });

    expect(duplicate).toBeNull();
  });

  it('returns null when the original URL is already shortened', async () => {
    await repository.insert({ code: 'aB3xK9q', originalUrl: 'https://stoik.com' });

    const duplicate = await repository.insert({
      code: 'zZ9yW8v',
      originalUrl: 'https://stoik.com',
    });

    expect(duplicate).toBeNull();
  });

  it('lets only one of two concurrent inserts with the same code succeed', async () => {
    const results = await Promise.all([
      repository.insert({ code: 'aB3xK9q', originalUrl: 'https://stoik.com' }),
      repository.insert({ code: 'aB3xK9q', originalUrl: 'https://other.com' }),
    ]);

    expect(results.filter((link) => link !== null)).toHaveLength(1);
    expect(await db.select().from(links)).toHaveLength(1);
  });

  it('finds a link by its code', async () => {
    await repository.insert({ code: 'aB3xK9q', originalUrl: 'https://stoik.com' });

    const link = await repository.findByCode('aB3xK9q');

    expect(link?.originalUrl).toBe('https://stoik.com');
  });

  it('distinguishes codes by case', async () => {
    await repository.insert({ code: 'aB3xK9q', originalUrl: 'https://stoik.com' });

    expect(await repository.findByCode('AB3XK9Q')).toBeNull();
  });

  it('returns null for an unknown code', async () => {
    expect(await repository.findByCode('zzzzzzz')).toBeNull();
  });

  it('finds a link by its original URL', async () => {
    await repository.insert({ code: 'aB3xK9q', originalUrl: 'https://stoik.com' });

    const link = await repository.findByOriginalUrl('https://stoik.com');

    expect(link?.code).toBe('aB3xK9q');
  });

  it('returns null for a URL that has not been shortened', async () => {
    expect(await repository.findByOriginalUrl('https://unknown.com')).toBeNull();
  });
});
