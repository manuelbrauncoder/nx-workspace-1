import {
  DOCUMENT,
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import type { I18nScope, I18nSharedSource } from '../i18n-scope';
import { I18N_SHARED_SOURCES } from '../i18n-shared-sources';
import { I18nService } from '../i18n.service';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE } from '../languages';
import { provideI18nLibrary } from '../provide-i18n';

export interface I18nTestingOptions {
  /** Shared texts as handed to `provideI18n()`, loaded on a language switch like in the app. */
  shared?: readonly I18nSharedSource[];
  /** The German files of the shared texts, set synchronously so every test renders right away. */
  sharedDe?: readonly object[];
}

/**
 * The German shared texts for tests, available synchronously. Set for every test through the
 * `src/test-setup.ts` of each project.
 *
 * Every test starts in German. A language switch leaves a cookie and `<html lang>` behind in the
 * document that all specs of a worker share, so both are reset here.
 */
export function provideI18nTesting(options: I18nTestingOptions = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideI18nLibrary(),
    { provide: I18N_SHARED_SOURCES, useValue: options.shared ?? [] },
    provideEnvironmentInitializer(() => {
      const document = inject(DOCUMENT);
      document.cookie = `${LANGUAGE_COOKIE}=; Max-Age=0; Path=/`;
      document.documentElement.lang = DEFAULT_LANGUAGE;
      const transloco = inject(TranslocoService);
      for (const texts of options.sharedDe ?? []) {
        transloco.setTranslation(texts, DEFAULT_LANGUAGE, { emitChange: false });
      }
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
