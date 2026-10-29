import { defineI18nSharedTexts } from '@core/i18n/i18n-scope';
import type de from './de.json';

declare module '@core/i18n/translation-key' {
  interface I18nSharedTexts {
    common: (typeof de)['common'];
    failure: (typeof de)['failure'];
    form: (typeof de)['form'];
    language: (typeof de)['language'];
    theme: (typeof de)['theme'];
  }
}

/** Texts of the wrappers, form controls and toggles. Every app hands them to `provideI18n()`. */
export const uiI18n = defineI18nSharedTexts<typeof de>({
  de: () => import('./de.json'),
  en: () => import('./en.json'),
});
