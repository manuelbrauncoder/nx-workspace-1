import { computed, DOCUMENT, inject, Service, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import type { I18nScope, TranslationLoaders } from './i18n-scope';
import { injectInitialLanguage } from './initial-language';
import { APP_LANGUAGES, AppLanguage, LANGUAGE_COOKIE } from './languages';
import { SharedTranslation, TranslationKey, TranslationParams } from './translation-key';

/** The shared scope: everything that is not specific to a page. Loaded before the first render. */
const SHARED_LOADERS: TranslationLoaders<SharedTranslation> = {
  de: () => import('@shared/i18n/de.json'),
  en: () => import('@shared/i18n/en.json'),
};

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/**
 * Translations and the active language. The only place besides the pipes that features, `shared`
 * and the app shell use for i18n, the translation library stays behind it.
 */
@Service()
export class I18nService {
  private readonly _transloco = inject(TranslocoService);
  private readonly _document = inject(DOCUMENT);

  private readonly _activeLanguage = signal<AppLanguage>(injectInitialLanguage());
  /** Counts loaded translation files, so texts read before a file arrived are rendered again. */
  private readonly _revision = signal(0);

  /** Page scopes in use. They are loaded again when the language changes. */
  private readonly _scopes = new Map<string, I18nScope>();
  /** Running and finished loads by `scope/language`, so no file is requested twice. */
  private readonly _loads = new Map<string, Promise<void>>();

  readonly language = this._activeLanguage.asReadonly();
  /** Locale for dates and numbers, e.g. `de-DE`. */
  readonly locale = computed(() => APP_LANGUAGES[this.language()].locale);

  constructor() {
    this._apply(this.language());
  }

  /** Runs once as an app initializer, so the shared scope is available before the first render. */
  init(): Promise<void> {
    return this._loadShared(this.language());
  }

  /** Loads a page scope in the active language. Called by the `loadI18nScope` route guard. */
  loadScope(scope: I18nScope): Promise<void> {
    this._scopes.set(scope.name, scope);
    return this._load(scope, this.language());
  }

  /** Switches the language once all scopes in use are loaded in it, so no key flashes up. */
  async setLanguage(language: AppLanguage): Promise<void> {
    await Promise.all([
      this._loadShared(language),
      ...[...this._scopes.values()].map((scope) => this._load(scope, language)),
    ]);
    this._apply(language);
    this._activeLanguage.set(language);
    this._document.cookie = `${LANGUAGE_COOKIE}=${language}; Path=/; Max-Age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax`;
  }

  /**
   * Text for a key in the active language. Reactive: a template, `computed` or validator that
   * calls it runs again when the language changes.
   */
  translate(key: TranslationKey, params?: TranslationParams): string {
    this.language();
    this._revision();
    return this._transloco.translate(key, params);
  }

  private _apply(language: AppLanguage): void {
    this._transloco.setActiveLang(language);
    this._document.documentElement.lang = language;
  }

  private _loadShared(language: AppLanguage): Promise<void> {
    return this._loadFile(language, SHARED_LOADERS[language]);
  }

  private _load(scope: I18nScope, language: AppLanguage): Promise<void> {
    // Transloco merges a `scope/language` file into the language, below the name of the scope.
    return this._loadFile(`${scope.name}/${language}`, scope.loaders[language]);
  }

  private _loadFile(path: string, loader: () => Promise<{ default: object }>): Promise<void> {
    let load = this._loads.get(path);
    if (!load) {
      load = loader().then(
        ({ default: translation }) => {
          this._transloco.setTranslation(translation, path, { emitChange: false });
          this._revision.update((revision) => revision + 1);
        },
        (error: unknown) => {
          // Not kept, so the next navigation or language switch tries again.
          this._loads.delete(path);
          throw error;
        },
      );
      this._loads.set(path, load);
    }
    return load;
  }
}
