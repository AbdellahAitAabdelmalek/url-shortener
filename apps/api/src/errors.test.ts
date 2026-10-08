import { ApiErrorSchema } from '@url-shortener/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { testConfig } from './test/config';

describe('error handling', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp(testConfig());
    app.get('/api/boom', async () => {
      throw new Error('Connection failed: password=hunter2');
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 404 in the ApiError format for an unknown route', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/unknown' });

    expect(response.statusCode).toBe(404);
    expect(ApiErrorSchema.parse(response.json()).error.code).toBe('NOT_FOUND');
  });

  it('answers 400 in the ApiError format for a malformed JSON body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/links',
      headers: { 'content-type': 'application/json' },
      payload: '{"url":',
    });

    expect(response.statusCode).toBe(400);
    expect(ApiErrorSchema.parse(response.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('answers 500 without leaking the details of an unexpected error', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/boom' });

    expect(response.statusCode).toBe(500);
    expect(ApiErrorSchema.parse(response.json())).toEqual({
      error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' },
    });
    expect(response.body).not.toContain('hunter2');
  });
});
