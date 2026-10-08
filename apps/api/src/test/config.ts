import { type Config, loadConfig } from '../config';

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/url_shortener_test';

export const TEST_PUBLIC_BASE_URL = 'https://sho.rt';

export function testConfig(overrides: Record<string, string> = {}): Config {
  return loadConfig({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: TEST_DATABASE_URL,
    PUBLIC_BASE_URL: TEST_PUBLIC_BASE_URL,
    ...overrides,
  });
}
