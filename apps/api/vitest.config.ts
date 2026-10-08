import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['./src/test/global-setup.ts'],
    // Test files share the same database: running them in parallel would make them flaky.
    fileParallelism: false,
  },
});
