// @ts-check
import { defineConfig } from 'eslint/config';
import baseConfig from '../../../eslint.config.mjs';

export default defineConfig([
  ...baseConfig,
  {
    // The translation library stays behind `@core/i18n`, so swapping it stays local.
    files: ['src/**/*.ts'],
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
  {
    // Wrappers also sit on native elements (`button[appUiButton]`) or are element directives
    // (`app-ui-menu`), so both selector kinds are allowed here.
    files: ['src/ui/**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        [
          { type: 'attribute', prefix: 'app', style: 'camelCase' },
          { type: 'element', prefix: 'app', style: 'kebab-case' },
        ],
      ],
      '@angular-eslint/component-selector': [
        'error',
        [
          { type: 'element', prefix: 'app', style: 'kebab-case' },
          { type: 'attribute', prefix: 'app', style: 'camelCase' },
        ],
      ],
    },
  },
]);
