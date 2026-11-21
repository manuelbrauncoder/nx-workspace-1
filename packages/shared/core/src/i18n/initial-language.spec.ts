import { REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  injectInitialLanguage,
  languageFromAcceptLanguage,
  languageFromCookie,
} from './initial-language';
import { DEFAULT_APP_LANGUAGE } from './languages';

describe('languageFromCookie', () => {
  it('reads the language cookie among other cookies', () => {
    expect(languageFromCookie('theme=dark; lang=en; session=abc')).toBe('en');
  });

  it('ignores a language the app does not support', () => {
    expect(languageFromCookie('lang=fr')).toBeUndefined();
  });

  it('returns nothing without cookies', () => {
    expect(languageFromCookie(null)).toBeUndefined();
    expect(languageFromCookie('')).toBeUndefined();
  });
});

describe('languageFromAcceptLanguage', () => {
  it('takes the first supported language', () => {
    expect(languageFromAcceptLanguage('fr-FR,fr;q=0.9,en-US;q=0.8,de;q=0.7')).toBe('en');
  });

  it('matches a region variant by its language', () => {
    expect(languageFromAcceptLanguage('de-AT')).toBe('de');
  });

  it('returns nothing when no language is supported', () => {
    expect(languageFromAcceptLanguage('fr,es')).toBeUndefined();
    expect(languageFromAcceptLanguage(null)).toBeUndefined();
  });
});

describe('injectInitialLanguage on the server', () => {
  function initialLanguage(headers: Record<string, string>, fallback?: 'de' | 'en') {
    TestBed.configureTestingModule({
      providers: [
        { provide: REQUEST, useValue: new Request('https://example.com/', { headers }) },
        ...(fallback ? [{ provide: DEFAULT_APP_LANGUAGE, useValue: fallback }] : []),
      ],
    });
    return TestBed.runInInjectionContext(() => injectInitialLanguage());
  }

  it('falls back to German unless the app sets another language', () => {
    expect(initialLanguage({ 'accept-language': 'fr' })).toBe('de');
  });

  it('falls back to the language the app sets for an unsupported browser language', () => {
    expect(initialLanguage({ 'accept-language': 'fr' }, 'en')).toBe('en');
  });

  it('falls back to the language the app sets without a browser language', () => {
    expect(initialLanguage({}, 'en')).toBe('en');
  });

  it('prefers the browser language over the fallback of the app', () => {
    expect(initialLanguage({ 'accept-language': 'de-DE,de;q=0.9' }, 'en')).toBe('de');
  });

  it('prefers the chosen language over the browser language', () => {
    expect(initialLanguage({ cookie: 'lang=en', 'accept-language': 'de' })).toBe('en');
  });
});
