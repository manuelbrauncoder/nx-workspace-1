import { languageFromAcceptLanguage, languageFromCookie } from './initial-language';

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
