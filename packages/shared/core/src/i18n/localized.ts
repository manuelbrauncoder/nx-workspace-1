import { AppLanguage } from './languages';

/**
 * A value in every language of the app, e.g. a text from the backend that an editor wrote in
 * German and English. Show it with the `localized` pipe or `I18nService.localize()`.
 */
export type Localized<T> = Record<AppLanguage, T>;

/** The same value in every language, e.g. `''` as the start of a form. */
export function localizedOf<T>(value: T): Localized<T> {
  return { de: value, en: value };
}
