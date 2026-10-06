import { describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { testConfig } from '../test/config';

describe('GET /health', () => {
  it('responds 200 when the database is reachable', async () => {
    const app = await buildApp(testConfig());

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    await app.close();
  });

  it('responds 503 when the database is unreachable', async () => {
    const app = await buildApp(
      testConfig({ DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:1/nowhere' }),
    );

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: 'unavailable' });
    await app.close();
  });
});
