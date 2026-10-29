import {
  DOCUMENT,
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import shared from '@shared/i18n/de.json';
import type { I18nScope } from '../i18n-scope';
import { I18nService } from '../i18n.service';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE } from '../languages';
import { provideI18nLibrary } from '../provide-i18n';

/**
 * The German shared scope for tests, available synchronously. Set for every test through
 * `src/test-setup.ts`.
 *
 * Every test starts in German. A language switch leaves a cookie and `<html lang>` behind in the
 * document that all specs of a worker share, so both are reset here.
 */
export function provideI18nTesting(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideI18nLibrary(),
    provideEnvironmentInitializer(() => {
      const document = inject(DOCUMENT);
      document.cookie = `${LANGUAGE_COOKIE}=; Max-Age=0; Path=/`;
      document.documentElement.lang = DEFAULT_LANGUAGE;
      inject(TranslocoService).setTranslation(shared, DEFAULT_LANGUAGE, { emitChange: false });
    }),
  ]);
}

/**
 * Loads page scopes in a spec, as the route guard does in the app. Importing the scope also makes
 * its keys known to the test build, so the spec of a page always loads the scopes it renders.
 *
 * @example
 * TestBed.configureTestingModule({ providers: [...] });
 * await loadI18nScopes(notesListI18n);
 * const fixture = TestBed.createComponent(NotesList);
 */
export async function loadI18nScopes(...scopes: I18nScope[]): Promise<void> {
  const i18n = TestBed.inject(I18nService);
  await Promise.all(scopes.map((scope) => i18n.loadScope(scope)));
}
