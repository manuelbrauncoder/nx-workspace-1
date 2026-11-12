import { defineI18nScope } from '@core/i18n/i18n-scope';
import type de from './i18n/de.json';

declare module '@core/i18n/translation-key' {
  interface I18nScopes {
    saveTheDatePage: typeof de;
  }
}

/** Texts of the public save-the-date page, loaded together with its route. */
export const saveTheDatePageI18n = defineI18nScope('saveTheDatePage', {
  de: () => import('./i18n/de.json'),
  en: () => import('./i18n/en.json'),
});
