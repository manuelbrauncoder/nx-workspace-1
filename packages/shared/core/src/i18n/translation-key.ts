/** Dot paths of all texts in a translation file. */
export type TranslationPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${TranslationPaths<T[K]>}`;
}[keyof T & string];

/**
 * Registry of the shared texts, top-level key to shape. Shared texts are loaded before the first
 * render and stay for every page. The UI library and the app add theirs through module
 * augmentation next to their translation files, so `core` knows the keys without importing them.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface I18nSharedTexts {}

/**
 * Registry of the page scopes, name to shape. A page adds its scope through module augmentation
 * in its `<page>.i18n.ts`, so `core` knows the keys without importing a feature.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface I18nScopes {}

/** Every key that can be translated: shared keys as they are, page keys prefixed with the scope. */
export type TranslationKey = TranslationPaths<I18nSharedTexts> | TranslationPaths<I18nScopes>;

/** Values for the `{{ placeholders }}` of a text. */
export type TranslationParams = Record<string, string | number>;
