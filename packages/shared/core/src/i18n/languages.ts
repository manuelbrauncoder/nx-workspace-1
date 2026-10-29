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

/** Cookie that holds the chosen language, so the server renders in it as well. */
export const LANGUAGE_COOKIE = 'lang';

export const isAppLanguage = (value: unknown): value is AppLanguage =>
  typeof value === 'string' && value in APP_LANGUAGES;
