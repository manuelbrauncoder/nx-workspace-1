// @ts-check
import { defineConfig } from 'eslint/config';
import angularConfig from '../../eslint.angular.mjs';
import baseConfig from '../../eslint.config.mjs';

/**
 * Architecture boundaries inside the app: presentation -> application -> domain -> api. The
 * boundaries between the app and the shared libs, and the ban on the UI libraries outside of
 * `ui`, are set through Nx tags in the root `eslint.config.mjs`.
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
// The translation library stays behind `core/i18n`, so swapping it stays local as well.
const I18N_LIBRARY = {
  regex: '^@jsverse/',
  message: 'Use I18nService and the pipes from @core/i18n instead.',
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
  ...angularConfig,
  restrictImports(['src/app/*.ts'], [I18N_LIBRARY]),
  // The app shell frames every page, so it knows neither features nor the API layer. The one
  // exception is the public API of the auth feature, for the account menu in the header.
  restrictImports(['src/app/layout/**/*.ts'], [LAYOUT, I18N_LIBRARY]),
  restrictImports(
    ['src/api/**/*.ts'],
    [
      {
        regex: '^@features/',
        message: 'The API layer stands on its own and must not depend on features.',
      },
    ],
  ),
  restrictImports(['src/app/features/**/*.ts'], [CROSS_FEATURE, API_LAYER, I18N_LIBRARY]),
  restrictImports(
    ['src/app/features/*/presentation/**/*.ts'],
    [CROSS_FEATURE, API_LAYER, I18N_LIBRARY],
  ),
  restrictImports(
    ['src/app/features/*/application/**/*.ts'],
    [
      CROSS_FEATURE,
      API_LAYER,
      I18N_LIBRARY,
      { regex: '(^|/)presentation/', message: 'application must not depend on presentation.' },
    ],
  ),
  restrictImports(
    ['src/app/features/*/domain/**/*.ts'],
    [
      CROSS_FEATURE,
      I18N_LIBRARY,
      {
        regex: '(^|/)(application|presentation)/',
        message: 'domain must not depend on application or presentation.',
      },
      { regex: '^@angular/common/http', message: 'domain must stay free of HTTP concerns.' },
    ],
  ),
]);
