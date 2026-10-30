// @ts-check
import angular from 'angular-eslint';
import { defineConfig } from 'eslint/config';

/** Rules for the Angular projects, added on top of the root `eslint.config.mjs`. */
export default defineConfig([
  {
    files: ['**/*.ts'],
    extends: [angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      // Untrusted HTML and URLs go through Angular's sanitizer, stored rich text through
      // `app-ui-rich-text`.
      'no-restricted-properties': [
        'error',
        ...['Html', 'Script', 'Style', 'Url', 'ResourceUrl'].map((kind) => ({
          property: `bypassSecurityTrust${kind}`,
          message: 'Do not switch off the sanitizer.',
        })),
      ],
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
]);
