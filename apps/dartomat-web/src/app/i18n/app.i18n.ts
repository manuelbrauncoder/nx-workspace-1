import { defineI18nSharedTexts } from '@core/i18n/i18n-scope';
import type de from './de.json';

declare module '@core/i18n/translation-key' {
  interface I18nSharedTexts {
    layout: (typeof de)['layout'];
    notFound: (typeof de)['notFound'];
  }
}

/**
 * Texts of this app that are not specific to one page: the layout, the not-found page and the
 * `seo` texts `SeoService` expects from every app.
 */
export const appI18n = defineI18nSharedTexts<typeof de>({
  de: () => import('./de.json'),
  en: () => import('./en.json'),
});
