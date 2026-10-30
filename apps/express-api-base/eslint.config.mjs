// @ts-check
import { defineConfig } from 'eslint/config';
import baseConfig from '../../eslint.config.mjs';

export default defineConfig([
  ...baseConfig,
  { ignores: ['drizzle', 'uploads'] },
  {
    // Both run before or without the logger: an invalid config stops the process, the migration
    // script runs on its own in the container.
    files: ['src/config/index.ts', 'src/scripts/migrate.ts'],
    rules: { 'no-console': 'off' },
  },
]);
