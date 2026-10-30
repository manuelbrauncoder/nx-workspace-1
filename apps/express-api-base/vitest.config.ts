import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: import.meta.dirname,
  resolve: { tsconfigPaths: true },
  test: {
    name: 'express-api-base',
    include: ['src/**/*.test.ts'],
    globalSetup: ['../../packages/server/core/src/testing/global-setup.ts'],
    setupFiles: ['src/test/setup.ts'],
    // all test files share one database
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      CONFIG_PATH: 'config/test.json',
      DATABASE_URL:
        process.env['TEST_DATABASE_URL'] ?? 'postgresql://app:app@localhost:5432/app_test',
      SESSION_SECRET: 'test-session-secret-at-least-32-characters',
    },
  },
});
