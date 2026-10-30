import {
  EnvironmentProviders,
  inject,
  isDevMode,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { provideTransloco, provideTranslocoMissingHandler } from '@jsverse/transloco';
import { I18nMissingHandler } from './i18n-missing-handler';
import type { I18nSharedSource } from './i18n-scope';
import { I18N_SHARED_SOURCES } from './i18n-shared-sources';
import { I18nService } from './i18n.service';
import { APP_LANGUAGE_CODES, DEFAULT_LANGUAGE } from './languages';

export interface I18nOptions {
  /** Shared texts, usually those of the UI library and those of the app. */
  shared: readonly I18nSharedSource[];
}

/** Transloco setup shared by the app and the tests. The files are loaded by `I18nService`. */
export function provideI18nLibrary(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideTransloco({
      config: {
        availableLangs: APP_LANGUAGE_CODES,
        defaultLang: DEFAULT_LANGUAGE,
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
    }),
    provideTranslocoMissingHandler(I18nMissingHandler),
  ]);
}

/**
 * Sets up translations and loads the shared texts before the app starts.
 *
 * @example
 * provideI18n({ shared: [uiI18n, appI18n] })
 */
export function provideI18n(options: I18nOptions): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideI18nLibrary(),
    { provide: I18N_SHARED_SOURCES, useValue: options.shared },
    provideAppInitializer(() => inject(I18nService).init()),
  ]);
}
