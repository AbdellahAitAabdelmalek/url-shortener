import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/server.ts'],
  platform: 'node',
  format: 'esm',
  deps: {
    // The shared package exposes TypeScript sources: bundle it rather than import it at runtime.
    alwaysBundle: ['@url-shortener/shared'],
  },
});
