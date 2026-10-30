// @ts-check
import { defineConfig } from 'eslint/config';
import baseConfig from '../../../eslint.config.mjs';

export default defineConfig([
  ...baseConfig,
  {
    // The one place that may write to the console. Everything else uses AppLog or ServerLog.
    files: ['src/log/log.ts', 'src/log/*.spec.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    // The translation library stays behind `i18n/`, so swapping it stays local.
    files: ['src/**/*.ts'],
    ignores: ['src/i18n/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^@jsverse/',
              message: 'Use I18nService and the pipes from @core/i18n instead.',
            },
          ],
        },
      ],
    },
  },
]);
