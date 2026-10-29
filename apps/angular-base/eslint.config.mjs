// @ts-check
import { defineConfig } from 'eslint/config';
import baseConfig from '../../eslint.config.mjs';

/**
 * Architecture boundaries: presentation -> application -> domain -> api.
 * A later block replaces the rule of an earlier one, so each block lists every restriction
 * that applies to its files.
 */
// Who is signed in concerns every page, so the auth feature opens exactly one file to the app
// shell and to other features. Everything else of it stays private.
const AUTH_PUBLIC_API = '@features/auth/public-api';
const CROSS_FEATURE = {
  regex: `^@features/(?!auth/public-api$)`,
  message: `Features must not import each other, except for ${AUTH_PUBLIC_API}. Inside a feature use relative imports.`,
};
const LAYOUT = {
  regex: `^@(features/(?!auth/public-api$)|api/)`,
  message: `The app shell must not depend on features or the API layer, except for ${AUTH_PUBLIC_API}.`,
};
const API_LAYER = {
  regex: '^@api/',
  message: 'Only the domain layer of a feature may import from the API layer.',
};
// The UI and icon libraries are only used inside the wrappers, so swapping them stays local.
const UI_LIBRARY = {
  regex: '^(@spartan-ng|@ng-icons|@tiptap)/',
  message: 'Use the wrappers from @shared/ui and @shared/form-controls instead.',
};
// The translation library stays behind `core/i18n`, so swapping it stays local as well.
const I18N_LIBRARY = {
  regex: '^@jsverse/',
  message: 'Use I18nService and the pipes from @core/i18n instead.',
};
const CORE_SHARED = {
  regex: '^@(features|api)/',
  message: 'core and shared must not depend on features or the API layer.',
};
/**
 * @param {string[]} files
 * @param {{ regex: string, message: string }[]} patterns
 * @returns {import('eslint').Linter.Config}
 */
const restrictImports = (files, patterns) => ({
  files,
  rules: { 'no-restricted-imports': ['error', { patterns }] },
});

export default defineConfig([
  ...baseConfig,
  {
    // The one place that may write to the console. Everything else uses AppLog or ServerLog.
    files: ['src/app/core/log/log.ts', 'src/app/core/log/*.spec.ts'],
    rules: { 'no-console': 'off' },
  },
  restrictImports(['src/app/*.ts'], [UI_LIBRARY, I18N_LIBRARY]),
  restrictImports(
    ['src/app/core/**/*.ts', 'src/app/shared/**/*.ts'],
    [CORE_SHARED, UI_LIBRARY, I18N_LIBRARY],
  ),
  // The one place that may import the translation library.
  restrictImports(['src/app/core/i18n/**/*.ts'], [CORE_SHARED, UI_LIBRARY]),
  // The app shell frames every page, so it knows neither features nor the API layer. The one
  // exception is the public API of the auth feature, for the account menu in the header.
  restrictImports(['src/app/layout/**/*.ts'], [LAYOUT, UI_LIBRARY, I18N_LIBRARY]),
  // The wrappers themselves are the one place that may import the UI and icon libraries.
  restrictImports(
    ['src/app/shared/ui/**/*.ts', 'src/app/shared/form-controls/**/*.ts'],
    [CORE_SHARED, I18N_LIBRARY],
  ),
  {
    // Wrappers also sit on native elements (`button[appUiButton]`) or are element directives
    // (`app-ui-menu`), so both selector kinds are allowed here.
    files: ['src/app/shared/ui/**/*.ts'],
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
  restrictImports(
    ['src/api/**/*.ts'],
    [
      {
        regex: '^@features/',
        message: 'The API layer stands on its own and must not depend on features.',
      },
    ],
  ),
  restrictImports(
    ['src/app/features/**/*.ts'],
    [CROSS_FEATURE, API_LAYER, UI_LIBRARY, I18N_LIBRARY],
  ),
  restrictImports(
    ['src/app/features/*/presentation/**/*.ts'],
    [CROSS_FEATURE, API_LAYER, UI_LIBRARY, I18N_LIBRARY],
  ),
  restrictImports(
    ['src/app/features/*/application/**/*.ts'],
    [
      CROSS_FEATURE,
      API_LAYER,
      UI_LIBRARY,
      I18N_LIBRARY,
      { regex: '(^|/)presentation/', message: 'application must not depend on presentation.' },
    ],
  ),
  restrictImports(
    ['src/app/features/*/domain/**/*.ts'],
    [
      CROSS_FEATURE,
      UI_LIBRARY,
      I18N_LIBRARY,
      {
        regex: '(^|/)(application|presentation)/',
        message: 'domain must not depend on application or presentation.',
      },
      { regex: '^@angular/common/http', message: 'domain must stay free of HTTP concerns.' },
    ],
  ),
]);
