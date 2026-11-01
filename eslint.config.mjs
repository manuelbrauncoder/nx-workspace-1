// @ts-check
import eslint from '@eslint/js';
import nx from '@nx/eslint-plugin';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

const UI_LIBRARIES = ['@spartan-ng/*', '@ng-icons/*', '@tiptap/*'];

/**
 * Rules for every project of the workspace. Project configs extend this file and add their own
 * restrictions, e.g. the layer rules of the features in `apps/angular-base/eslint.config.mjs`.
 * Angular projects add `eslint.angular.mjs` on top.
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
          allow: [
            '^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$',
            // Features and the API layer still live inside apps/angular-base. The aliases stay,
            // because the layer rules of the app match on them. Remove these once they are libs.
            '^@features/.*',
            '^@api/.*',
          ],
          depConstraints: [
            // Browser side. The UI and icon libraries are only used inside the `ui` lib, so
            // swapping them stays local to it.
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: ['type:ui', 'type:core', 'type:styles', 'type:contract'],
              bannedExternalImports: UI_LIBRARIES,
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: [
                'type:ui',
                'type:core',
                'type:helm',
                'type:styles',
                'type:contract',
              ],
            },
            {
              sourceTag: 'type:core',
              onlyDependOnLibsWithTags: ['type:core'],
              bannedExternalImports: UI_LIBRARIES,
            },
            {
              sourceTag: 'type:helm',
              onlyDependOnLibsWithTags: ['type:helm'],
            },
            {
              sourceTag: 'type:styles',
              onlyDependOnLibsWithTags: ['type:styles'],
            },
            // Server side.
            {
              sourceTag: 'type:api-app',
              onlyDependOnLibsWithTags: ['type:server', 'type:contract'],
            },
            {
              sourceTag: 'type:server',
              onlyDependOnLibsWithTags: ['type:server', 'type:contract'],
            },
            // Products. Shared libs know no product, products do not know each other.
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
            {
              sourceTag: 'scope:base',
              onlyDependOnLibsWithTags: ['scope:base', 'scope:shared'],
            },
            {
              sourceTag: 'scope:portfolio',
              onlyDependOnLibsWithTags: ['scope:portfolio', 'scope:shared'],
            },
            {
              sourceTag: 'scope:dartomat',
              onlyDependOnLibsWithTags: ['scope:dartomat', 'scope:shared'],
            },
            // Shared by both sides, so it may only use what runs in the browser and in Node.
            {
              sourceTag: 'type:contract',
              onlyDependOnLibsWithTags: ['type:contract'],
              allowedExternalImports: ['zod'],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.ts'],
    extends: [eslint.configs.recommended, tseslint.configs.recommended, tseslint.configs.stylistic],
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
    },
  },
]);
