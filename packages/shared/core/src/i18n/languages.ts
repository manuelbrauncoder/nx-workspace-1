import { InjectionToken } from '@angular/core';

export interface AppLanguageDefinition {
  /** Shown in the language switcher, in the language itself. */
  label: string;
  /** Locale used for dates and numbers. */
  locale: string;
}

/** Every language of the app. Adding one here requires a translation file in every scope. */
export const APP_LANGUAGES = {
  de: { label: 'Deutsch', locale: 'de-DE' },
  en: { label: 'English', locale: 'en-GB' },
} as const satisfies Record<string, AppLanguageDefinition>;

export type AppLanguage = keyof typeof APP_LANGUAGES;

export const APP_LANGUAGE_CODES = Object.keys(APP_LANGUAGES) as AppLanguage[];

export const DEFAULT_LANGUAGE: AppLanguage = 'de';

/**
 * Language of a visitor whose browser asks for none of the app's languages and who has not
 * chosen one yet. `DEFAULT_LANGUAGE` unless the app sets it through `provideI18n()`.
 */
export const DEFAULT_APP_LANGUAGE = new InjectionToken<AppLanguage>('DEFAULT_APP_LANGUAGE', {
  factory: () => DEFAULT_LANGUAGE,
});

/** Cookie that holds the chosen language, so the server renders in it as well. */
export const LANGUAGE_COOKIE = 'lang';

export const isAppLanguage = (value: unknown): value is AppLanguage =>
  typeof value === 'string' && value in APP_LANGUAGES;
