import type { Link } from '@url-shortener/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, createLink } from './client';

const link: Link = {
  code: 'aB3xK9q',
  shortUrl: 'http://localhost:4000/aB3xK9q',
  originalUrl: 'https://stoik.com/',
  createdAt: '2026-10-08T12:00:00.000Z',
};

function mockFetch(status: number, body: unknown) {
  const response = new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createLink', () => {
  it('posts the URL to the API', async () => {
    mockFetch(201, link);

    await createLink({ url: 'https://stoik.com/' });

    expect(fetch).toHaveBeenCalledWith('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://stoik.com/' }),
    });
  });

  it('returns a new link on a 201', async () => {
    mockFetch(201, link);

    await expect(createLink({ url: 'https://stoik.com/' })).resolves.toEqual({
      link,
      created: true,
    });
  });

  it('returns the existing link on a 200', async () => {
    mockFetch(200, link);

    await expect(createLink({ url: 'https://stoik.com/' })).resolves.toEqual({
      link,
      created: false,
    });
  });

  it('throws the code and message of an API error', async () => {
    mockFetch(429, {
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again in 1 minute.' },
    });

    const error = await createLink({ url: 'https://stoik.com/' }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again in 1 minute.',
    });
  });

  it('throws a network error when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(createLink({ url: 'https://stoik.com/' })).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });

  it('throws a generic error on a response that is not JSON', async () => {
    mockFetch(502, '<html>Bad Gateway</html>');

    await expect(createLink({ url: 'https://stoik.com/' })).rejects.toMatchObject({
      code: 'UNEXPECTED_RESPONSE',
      message: 'Something went wrong. Please try again.',
    });
  });

  it('throws a generic error on a response that does not follow the contract', async () => {
    mockFetch(201, { ...link, createdAt: 'yesterday' });

    await expect(createLink({ url: 'https://stoik.com/' })).rejects.toMatchObject({
      code: 'UNEXPECTED_RESPONSE',
    });
  });
});
