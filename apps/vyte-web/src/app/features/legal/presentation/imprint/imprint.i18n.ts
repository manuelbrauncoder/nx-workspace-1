import { defineI18nScope } from '@core/i18n/i18n-scope';
import type de from './i18n/de.json';

declare module '@core/i18n/translation-key' {
  interface I18nScopes {
    legalImprint: typeof de;
  }
}

/** Texts of this page, loaded together with its route. */
export const legalImprintI18n = defineI18nScope('legalImprint', {
  de: () => import('./i18n/de.json'),
  en: () => import('./i18n/en.json'),
});
