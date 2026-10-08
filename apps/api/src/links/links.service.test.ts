import { describe, expect, it } from 'vitest';
import type { LinkRow } from '../db/schema';
import { DomainError } from '../errors';
import type { LinksRepository } from './links.repository';
import { createLinksService } from './links.service';

function linkRow(code: string, originalUrl: string): LinkRow {
  return { id: 1, code, originalUrl, createdAt: new Date() };
}

/**
 * In-memory repository with the same unique constraints as the database (code and original URL):
 * the service logic is tested without a database.
 */
function createFakeRepository(existing: LinkRow[] = []): LinksRepository {
  const rows = [...existing];
  return {
    async insert({ code, originalUrl }) {
      if (rows.some((row) => row.code === code || row.originalUrl === originalUrl)) return null;
      const row = linkRow(code, originalUrl);
      rows.push(row);
      return row;
    },
    async findByCode(code) {
      return rows.find((row) => row.code === code) ?? null;
    },
    async findByOriginalUrl(originalUrl) {
      return rows.find((row) => row.originalUrl === originalUrl) ?? null;
    },
  };
}

/** Returns the given codes in order, then repeats the last one. */
function codesInOrder(...codes: string[]) {
  let index = 0;
  return () => codes[Math.min(index++, codes.length - 1)] ?? '';
}

describe('LinksService.create', () => {
  it('creates a link', async () => {
    const service = createLinksService({
      repository: createFakeRepository(),
      publicBaseUrl: 'https://sho.rt',
      generateCode: codesInOrder('aB3xK9q'),
    });

    const result = await service.create('https://stoik.com/');

    expect(result.created).toBe(true);
    expect(result.link).toMatchObject({ code: 'aB3xK9q', originalUrl: 'https://stoik.com/' });
  });

  it('returns the existing link when the URL has already been shortened', async () => {
    const service = createLinksService({
      repository: createFakeRepository([linkRow('exist01', 'https://stoik.com/')]),
      publicBaseUrl: 'https://sho.rt',
      generateCode: codesInOrder('aB3xK9q'),
    });

    const result = await service.create('https://stoik.com/');

    expect(result.created).toBe(false);
    expect(result.link.code).toBe('exist01');
  });

  it('returns the link created by a concurrent request for the same URL', async () => {
    const concurrentLink = linkRow('other01', 'https://stoik.com/');
    let lookups = 0;
    // The URL is not found at first, then the insert conflicts: another request has just
    // shortened it.
    const repository: LinksRepository = {
      insert: async () => null,
      findByCode: async () => null,
      findByOriginalUrl: async () => (lookups++ === 0 ? null : concurrentLink),
    };
    const service = createLinksService({ repository, publicBaseUrl: 'https://sho.rt' });

    const result = await service.create('https://stoik.com/');

    expect(result).toEqual({ link: concurrentLink, created: false });
  });

  it('retries with a new code when the generated one is already taken', async () => {
    const service = createLinksService({
      repository: createFakeRepository([linkRow('taken01', 'https://taken.com/')]),
      publicBaseUrl: 'https://sho.rt',
      generateCode: codesInOrder('taken01', 'aB3xK9q'),
    });

    const result = await service.create('https://stoik.com/');

    expect(result.link.code).toBe('aB3xK9q');
  });

  it('gives up after 5 collisions in a row', async () => {
    const service = createLinksService({
      repository: createFakeRepository([linkRow('taken01', 'https://taken.com/')]),
      publicBaseUrl: 'https://sho.rt',
      generateCode: codesInOrder('taken01'),
    });

    await expect(service.create('https://stoik.com/')).rejects.toThrow(
      'No unique code found after 5 attempts',
    );
  });

  it.each(['https://sho.rt/aB3xK9q', 'http://sho.rt/aB3xK9q', 'https://sho.rt:8443/aB3xK9q'])(
    'refuses to shorten its own short links (%s)',
    async (url) => {
      const service = createLinksService({
        repository: createFakeRepository(),
        publicBaseUrl: 'https://sho.rt',
      });

      const creation = service.create(url);

      await expect(creation).rejects.toBeInstanceOf(DomainError);
      await expect(creation).rejects.toMatchObject({ code: 'INVALID_TARGET' });
    },
  );
});
