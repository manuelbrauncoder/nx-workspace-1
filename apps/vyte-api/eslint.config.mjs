// @ts-check
import { defineConfig } from 'eslint/config';
import baseConfig from '../../eslint.config.mjs';

export default defineConfig([
  ...baseConfig,
  { ignores: ['drizzle', 'uploads'] },
  {
    // Runs on its own in the container, without the config file and the logger.
    files: ['src/scripts/migrate.ts'],
    rules: { 'no-console': 'off' },
  },
]);
