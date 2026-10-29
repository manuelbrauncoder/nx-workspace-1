import {
  EnvironmentProviders,
  inject,
  isDevMode,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { provideTransloco, provideTranslocoMissingHandler } from '@jsverse/transloco';
import { I18nMissingHandler } from './i18n-missing-handler';
import { I18nService } from './i18n.service';
import { APP_LANGUAGE_CODES, DEFAULT_LANGUAGE } from './languages';

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

/** Sets up translations and loads the shared scope before the app starts. */
export function provideI18n(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideI18nLibrary(),
    provideAppInitializer(() => inject(I18nService).init()),
  ]);
}
