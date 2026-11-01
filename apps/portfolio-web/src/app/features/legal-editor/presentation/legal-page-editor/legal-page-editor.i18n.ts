import { defineI18nScope } from '@core/i18n/i18n-scope';
import type de from './i18n/de.json';

declare module '@core/i18n/translation-key' {
  interface I18nScopes {
    legalPageEditor: typeof de;
  }
}

/** Texts of this page, loaded together with its route. */
export const legalPageEditorI18n = defineI18nScope('legalPageEditor', {
  de: () => import('./i18n/de.json'),
  en: () => import('./i18n/en.json'),
});
