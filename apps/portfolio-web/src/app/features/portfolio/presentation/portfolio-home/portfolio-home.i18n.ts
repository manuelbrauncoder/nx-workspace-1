import { defineI18nScope } from '@core/i18n/i18n-scope';
import type de from './i18n/de.json';

declare module '@core/i18n/translation-key' {
  interface I18nScopes {
    portfolioHome: typeof de;
  }
}

/** Texts of the start page and all of its sections, loaded together with its route. */
export const portfolioHomeI18n = defineI18nScope('portfolioHome', {
  de: () => import('./i18n/de.json'),
  en: () => import('./i18n/en.json'),
});
