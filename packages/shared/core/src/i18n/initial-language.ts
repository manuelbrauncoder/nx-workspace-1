import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, inject, PLATFORM_ID, REQUEST } from '@angular/core';
import { AppLanguage, DEFAULT_APP_LANGUAGE, isAppLanguage, LANGUAGE_COOKIE } from './languages';

/** Value of the language cookie in a `Cookie` header or in `document.cookie`. */
export function languageFromCookie(cookies: string | null | undefined): AppLanguage | undefined {
  const value = cookies
    ?.split(';')
    .map((cookie) => cookie.trim().split('='))
    .find(([name]) => name === LANGUAGE_COOKIE)?.[1];
  return isAppLanguage(value) ? value : undefined;
}

/** First supported language of an `Accept-Language` header, which lists them by preference. */
export function languageFromAcceptLanguage(
  header: string | null | undefined,
): AppLanguage | undefined {
  return header
    ?.split(',')
    .map((entry) => entry.split(';')[0].trim().split('-')[0].toLowerCase())
    .find(isAppLanguage);
}

/**
 * Language the app starts in. The server decides from the cookie, then the browser preference,
 * then the fallback of the app (`DEFAULT_APP_LANGUAGE`), and renders `<html lang>` accordingly. The browser takes over that attribute, so both always agree
 * and hydration never sees a different language.
 */
export function injectInitialLanguage(): AppLanguage {
  const fallbackLanguage = inject(DEFAULT_APP_LANGUAGE);
  const request = inject(REQUEST, { optional: true });
  if (request) {
    return (
      languageFromCookie(request.headers.get('cookie')) ??
      languageFromAcceptLanguage(request.headers.get('accept-language')) ??
      fallbackLanguage
    );
  }
  const rendered = inject(DOCUMENT).documentElement.lang;
  const fallback = isAppLanguage(rendered) ? rendered : fallbackLanguage;
  // The server DOM has no cookies. Without a request, e.g. while the build extracts the routes,
  // there is nothing else to go by.
  return isPlatformBrowser(inject(PLATFORM_ID))
    ? (languageFromCookie(inject(DOCUMENT).cookie) ?? fallback)
    : fallback;
}
