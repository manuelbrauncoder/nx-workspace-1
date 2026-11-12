import { defineI18nScope } from '@core/i18n/i18n-scope';
import type de from './i18n/de.json';

declare module '@core/i18n/translation-key' {
  interface I18nScopes {
    rsvp: typeof de;
  }
}

/** Texts of the guest page and its image dialog, loaded together with its route. */
export const rsvpI18n = defineI18nScope('rsvp', {
  de: () => import('./i18n/de.json'),
  en: () => import('./i18n/en.json'),
});
