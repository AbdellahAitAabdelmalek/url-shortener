import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { testConfig } from './test/config';

describe('static front-end', () => {
  let staticDir: string;

  beforeAll(async () => {
    staticDir = await mkdtemp(join(tmpdir(), 'url-shortener-static-'));
    await mkdir(join(staticDir, 'assets'));
    await writeFile(join(staticDir, 'index.html'), '<!doctype html><title>App</title>');
    await writeFile(join(staticDir, 'assets', 'index.js'), 'console.log("app")');
  });

  afterAll(async () => {
    await rm(staticDir, { recursive: true, force: true });
  });

  it('serves index.html on / and the built assets when STATIC_DIR is set', async () => {
    const app = await buildApp(testConfig({ STATIC_DIR: staticDir }));

    const page = await app.inject({ method: 'GET', url: '/' });
    const asset = await app.inject({ method: 'GET', url: '/assets/index.js' });

    expect(page.statusCode).toBe(200);
    expect(page.headers['content-type']).toContain('text/html');
    expect(asset.statusCode).toBe(200);
    await app.close();
  });

  it('does not serve files when STATIC_DIR is unset', async () => {
    const app = await buildApp(testConfig());

    const page = await app.inject({ method: 'GET', url: '/' });

    expect(page.statusCode).toBe(404);
    await app.close();
  });
});
