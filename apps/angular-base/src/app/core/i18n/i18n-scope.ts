import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { I18nService } from './i18n.service';
import { AppLanguage } from './languages';
import { I18nScopes } from './translation-key';

/** Loads the translation file of one language, usually a dynamic `import()` of the JSON file. */
export type TranslationLoader<T> = () => Promise<{ default: T }>;

export type TranslationLoaders<T> = Record<AppLanguage, TranslationLoader<T>>;

/** Translations that belong to one page and are loaded together with its route. */
export interface I18nScope {
  /** Prefix of the keys, e.g. `notesList` for `notesList.heading`. */
  readonly name: string;
  readonly loaders: TranslationLoaders<object>;
}

/**
 * Defines the scope of a page. The name has to be registered in `I18nScopes`, which also makes
 * every language file match the shape of the registered one.
 *
 * @example
 * declare module '@core/i18n/translation-key' {
 *   interface I18nScopes {
 *     notesList: typeof de;
 *   }
 * }
 *
 * export const notesListI18n = defineI18nScope('notesList', {
 *   de: () => import('./i18n/de.json'),
 *   en: () => import('./i18n/en.json'),
 * });
 */
export function defineI18nScope<K extends keyof I18nScopes & string>(
  name: K,
  loaders: TranslationLoaders<I18nScopes[K]>,
): I18nScope {
  return { name, loaders };
}

/** Shared texts of the UI library or the app, handed to `provideI18n()`. */
export type I18nSharedSource = TranslationLoaders<object>;

/**
 * Defines shared texts. Their keys have to be registered in `I18nSharedTexts`, and every language
 * file must match the shape of the German one.
 *
 * @example
 * declare module '@core/i18n/translation-key' {
 *   interface I18nSharedTexts {
 *     layout: (typeof de)['layout'];
 *   }
 * }
 *
 * export const appI18n = defineI18nSharedTexts<typeof de>({
 *   de: () => import('./de.json'),
 *   en: () => import('./en.json'),
 * });
 */
export function defineI18nSharedTexts<T extends object>(
  loaders: TranslationLoaders<T>,
): I18nSharedSource {
  return loaders;
}

/**
 * Route guard that loads a scope before the page renders, on the server and in the browser.
 *
 * @example
 * { path: '', canActivate: [loadI18nScope(notesListI18n)], loadComponent: ... }
 */
export function loadI18nScope(scope: I18nScope): CanActivateFn {
  return async () => {
    await inject(I18nService).loadScope(scope);
    return true;
  };
}
