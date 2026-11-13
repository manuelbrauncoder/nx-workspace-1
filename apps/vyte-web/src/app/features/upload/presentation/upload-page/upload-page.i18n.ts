import { defineI18nScope } from '@core/i18n/i18n-scope';
import type de from './i18n/de.json';

declare module '@core/i18n/translation-key' {
  interface I18nScopes {
    uploadPage: typeof de;
  }
}

/** Texts of both upload pages, loaded together with their route. */
export const uploadPageI18n = defineI18nScope('uploadPage', {
  de: () => import('./i18n/de.json'),
  en: () => import('./i18n/en.json'),
});
