// @ts-check
import { defineConfig } from 'eslint/config';
import baseConfig from '../../../eslint.config.mjs';

export default defineConfig([
  ...baseConfig,
  {
    // An invalid config stops the process before the logger exists.
    files: ['src/config.ts'],
    rules: { 'no-console': 'off' },
  },
]);
