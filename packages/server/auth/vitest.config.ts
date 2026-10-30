import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: import.meta.dirname,
  resolve: { tsconfigPaths: true },
  test: {
    name: 'server-auth',
    include: ['src/**/*.test.ts'],
    globalSetup: ['../../../packages/server/core/src/testing/global-setup.ts'],
    setupFiles: ['src/testing/setup.ts'],
    // all test files share one database
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      CONFIG_PATH: 'src/testing/test-config.json',
      // A database of its own, so it can run next to the tests of the API apps.
      DATABASE_URL:
        process.env['TEST_DATABASE_URL_SERVER_AUTH'] ??
        'postgresql://app:app@localhost:5432/server_auth_test',
      SESSION_SECRET: 'test-session-secret-at-least-32-characters',
    },
  },
});
