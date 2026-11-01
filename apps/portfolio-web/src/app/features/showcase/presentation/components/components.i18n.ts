import { defineI18nScope } from '@core/i18n/i18n-scope';
import type de from './i18n/de.json';

declare module '@core/i18n/translation-key' {
  interface I18nScopes {
    showcaseComponents: typeof de;
  }
}

/** Texts of this page, loaded together with its route. */
export const showcaseComponentsI18n = defineI18nScope('showcaseComponents', {
  de: () => import('./i18n/de.json'),
  en: () => import('./i18n/en.json'),
});
