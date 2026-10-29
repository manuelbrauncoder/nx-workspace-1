// @ts-check
import eslint from '@eslint/js';
import nx from '@nx/eslint-plugin';
import angular from 'angular-eslint';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

/**
 * Rules for every project of the workspace. Project configs extend this file and add their own
 * restrictions, e.g. the layer rules of the features in `apps/angular-base/eslint.config.mjs`.
 */
export default defineConfig([
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/vite.config.*.timestamp*', '**/vitest.config.*.timestamp*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: ['type:ui', 'type:core', 'type:styles'],
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:ui', 'type:core', 'type:helm', 'type:styles'],
            },
            {
              sourceTag: 'type:core',
              onlyDependOnLibsWithTags: ['type:core'],
            },
            {
              sourceTag: 'type:helm',
              onlyDependOnLibsWithTags: ['type:helm'],
            },
            {
              sourceTag: 'type:styles',
              onlyDependOnLibsWithTags: ['type:styles'],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      // Added by the Nx presets. Signals and `@ViewChild` make `!` common in Angular code, and
      // `no-empty-object-type` from typescript-eslint already covers empty interfaces.
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      'no-console': 'error',
      // A private member starts with an underscore, so `_me` (state) and `me` (what others
      // read) can sit next to each other. `protected` is for inheritance only.
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'memberLike',
          modifiers: ['private'],
          format: ['camelCase'],
          leadingUnderscore: 'require',
        },
      ],
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
