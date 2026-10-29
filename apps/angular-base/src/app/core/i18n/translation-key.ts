import type shared from '@shared/i18n/de.json';

/** Dot paths of all texts in a translation file. */
export type TranslationPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${TranslationPaths<T[K]>}`;
}[keyof T & string];

/** Shape of the shared scope. The German file is the reference for every other language. */
export type SharedTranslation = typeof shared;

/**
 * Registry of the page scopes, name to shape. A page adds its scope through module augmentation
 * in its `<page>.i18n.ts`, so `core` knows the keys without importing a feature.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface I18nScopes {}

/** Every key that can be translated: shared keys as they are, page keys prefixed with the scope. */
export type TranslationKey = TranslationPaths<SharedTranslation> | TranslationPaths<I18nScopes>;

/** Values for the `{{ placeholders }}` of a text. */
export type TranslationParams = Record<string, string | number>;
