import { ApiErrorSchema, LinkSchema } from '@url-shortener/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { createDatabase } from '../db/client';
import { links } from '../db/schema';
import { TEST_DATABASE_URL, TEST_PUBLIC_BASE_URL, testConfig } from '../test/config';
import { createLinksRepository } from './links.repository';

const { pool, db } = createDatabase(TEST_DATABASE_URL);
let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(async () => {
  app = await buildApp(testConfig());
});

beforeEach(async () => {
  await db.delete(links);
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

function postLink(body: object) {
  return app.inject({ method: 'POST', url: '/api/links', payload: body });
}

describe('POST /api/links', () => {
  it('creates a short link that follows the shared contract', async () => {
    const response = await postLink({ url: 'https://stoik.com/barometre' });

    expect(response.statusCode).toBe(201);
    const link = LinkSchema.parse(response.json());
    expect(link.originalUrl).toBe('https://stoik.com/barometre');
    expect(link.shortUrl).toBe(`${TEST_PUBLIC_BASE_URL}/${link.code}`);
  });

  it('stores the link', async () => {
    const link = LinkSchema.parse((await postLink({ url: 'https://stoik.com/' })).json());

    const stored = await createLinksRepository(db).findByCode(link.code);

    expect(stored?.originalUrl).toBe('https://stoik.com/');
  });

  it('normalizes the URL with the shared schema', async () => {
    const response = await postLink({ url: '  stoik.com  ' });

    expect(response.json()).toMatchObject({ originalUrl: 'https://stoik.com/' });
  });

  it('returns the existing link with a 200 when the URL has already been shortened', async () => {
    const first = await postLink({ url: 'https://stoik.com/' });
    const second = await postLink({ url: 'https://stoik.com/' });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual(first.json());
  });

  it('considers two spellings of the same URL as the same link', async () => {
    const first = LinkSchema.parse((await postLink({ url: 'stoik.com' })).json());
    const second = LinkSchema.parse((await postLink({ url: 'HTTPS://STOIK.COM:443/' })).json());

    expect(second.code).toBe(first.code);
  });

  it('creates a single link when concurrent requests shorten the same URL', async () => {
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => postLink({ url: 'https://stoik.com/' })),
    );

    const codes = new Set(responses.map((response) => LinkSchema.parse(response.json()).code));
    expect(codes.size).toBe(1);
    expect(responses.filter((response) => response.statusCode === 201)).toHaveLength(1);
    expect(await db.select().from(links)).toHaveLength(1);
  });

  it('rejects an invalid URL with the message of the shared schema', async () => {
    const response = await postLink({ url: 'javascript:alert(1)' });

    expect(response.statusCode).toBe(400);
    expect(ApiErrorSchema.parse(response.json())).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please enter a valid URL, like https://example.com.',
      },
    });
  });

  it('rejects its own short links', async () => {
    const response = await postLink({ url: `${TEST_PUBLIC_BASE_URL}/aB3xK9q` });

    expect(response.statusCode).toBe(400);
    expect(ApiErrorSchema.parse(response.json())).toEqual({
      error: { code: 'INVALID_TARGET', message: 'This URL is already a short link.' },
    });
  });

  it('limits the number of links an IP address can create per minute', async () => {
    const limitedApp = await buildApp(testConfig({ RATE_LIMIT_PER_MINUTE: '2' }));
    const post = (url: string) =>
      limitedApp.inject({ method: 'POST', url: '/api/links', payload: { url } });

    await post('https://stoik.com/1');
    await post('https://stoik.com/2');
    const response = await post('https://stoik.com/3');

    expect(response.statusCode).toBe(429);
    expect(response.headers['retry-after']).toBeDefined();
    expect(ApiErrorSchema.parse(response.json()).error.code).toBe('RATE_LIMITED');
    await limitedApp.close();
  });
});

describe('GET /:code', () => {
  it('redirects to the original URL with a 302', async () => {
    const link = LinkSchema.parse((await postLink({ url: 'https://stoik.com/barometre' })).json());

    const response = await app.inject({ method: 'GET', url: `/${link.code}` });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('https://stoik.com/barometre');
  });

  it('shows the 404 page for an unknown code', async () => {
    const response = await app.inject({ method: 'GET', url: '/zzzzzzz' });

    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('Link not found');
  });

  it('rejects a malformed code without querying the database', async () => {
    // "0" is not in the alphabet: a lookup would find this row, the format check must not.
    await createLinksRepository(db).insert({ code: '0000000', originalUrl: 'https://stoik.com/' });

    const response = await app.inject({ method: 'GET', url: '/0000000' });

    expect(response.statusCode).toBe(404);
  });
});
