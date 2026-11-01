// @ts-check
import { defineConfig } from 'eslint/config';
import baseConfig from '../../eslint.config.mjs';

export default defineConfig([
  ...baseConfig,
  { ignores: ['drizzle'] },
  {
    // Scripts run on their own in the container; an invalid config stops before the logger exists.
    files: ['src/scripts/*.ts'],
    rules: { 'no-console': 'off' },
  },
]);
