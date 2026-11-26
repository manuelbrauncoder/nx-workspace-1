import { defineI18nScope } from '@core/i18n/i18n-scope';
import type de from './i18n/de.json';

declare module '@core/i18n/translation-key' {
  interface I18nScopes {
    eventSaveTheDate: typeof de;
  }
}

export const eventSaveTheDateI18n = defineI18nScope('eventSaveTheDate', {
  de: () => import('./i18n/de.json'),
  en: () => import('./i18n/en.json'),
});
