import { defineI18nScope } from '@core/i18n/i18n-scope';
import type de from './i18n/de.json';

declare module '@core/i18n/translation-key' {
  interface I18nScopes {
    legalPage: typeof de;
  }
}

/** Texts of the legal pages, loaded together with their routes. */
export const legalPageI18n = defineI18nScope('legalPage', {
  de: () => import('./i18n/de.json'),
  en: () => import('./i18n/en.json'),
});
