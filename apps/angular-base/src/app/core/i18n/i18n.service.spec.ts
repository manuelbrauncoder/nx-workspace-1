import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { defineI18nScope } from './i18n-scope';
import { I18nService } from './i18n.service';
import { LANGUAGE_COOKIE } from './languages';

declare module './translation-key' {
  interface I18nScopes {
    specPage: { greeting: string };
  }
}

const specPageI18n = defineI18nScope('specPage', {
  de: () => Promise.resolve({ default: { greeting: 'Hallo {{ name }}' } }),
  en: () => Promise.resolve({ default: { greeting: 'Hello {{ name }}' } }),
});

describe('I18nService', () => {
  let service: I18nService;
  let document: Document;

  beforeEach(() => {
    document = TestBed.inject(DOCUMENT);
    document.cookie = `${LANGUAGE_COOKIE}=; Max-Age=0; Path=/`;
    document.documentElement.lang = '';
    service = TestBed.inject(I18nService);
  });

  it('starts in the default language and sets it on the document', () => {
    expect(service.language()).toBe('de');
    expect(service.locale()).toBe('de-DE');
    expect(document.documentElement.lang).toBe('de');
  });

  it('translates keys of the shared scope', () => {
    expect(service.translate('common.cancel')).toBe('Abbrechen');
  });

  it('translates keys of a page scope once it is loaded, with params', async () => {
    await service.loadScope(specPageI18n);

    expect(service.translate('specPage.greeting', { name: 'Ada' })).toBe('Hallo Ada');
  });

  it('switches the language for the shared scope and every scope in use', async () => {
    await service.loadScope(specPageI18n);

    await service.setLanguage('en');

    expect(service.language()).toBe('en');
    expect(service.locale()).toBe('en-GB');
    expect(service.translate('common.cancel')).toBe('Cancel');
    expect(service.translate('specPage.greeting', { name: 'Ada' })).toBe('Hello Ada');
    expect(document.documentElement.lang).toBe('en');
    expect(document.cookie).toContain(`${LANGUAGE_COOKIE}=en`);
  });

  it('loads a scope only once per language', async () => {
    const de = vi.fn(() => Promise.resolve({ default: { greeting: 'Hallo' } }));
    const scope = defineI18nScope('specPage', { de, en: de });

    await Promise.all([service.loadScope(scope), service.loadScope(scope)]);

    expect(de).toHaveBeenCalledTimes(1);
  });
});

describe('I18nService start language', () => {
  // Sets up the test environment, which puts the document back to German. What a test writes
  // into the document afterwards is what the service starts with.
  beforeEach(() => TestBed.inject(DOCUMENT));

  it('takes over the language the server rendered', () => {
    document.documentElement.lang = 'en';

    expect(TestBed.inject(I18nService).language()).toBe('en');
  });

  it('prefers the cookie', () => {
    document.documentElement.lang = 'de';
    document.cookie = `${LANGUAGE_COOKIE}=en; Path=/`;

    expect(TestBed.inject(I18nService).language()).toBe('en');
  });
});
