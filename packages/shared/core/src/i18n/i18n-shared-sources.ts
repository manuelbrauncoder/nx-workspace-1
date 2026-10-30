import { InjectionToken } from '@angular/core';
import type { I18nSharedSource } from './i18n-scope';

/** Shared texts the app loads before the first render, set through `provideI18n()`. */
export const I18N_SHARED_SOURCES = new InjectionToken<readonly I18nSharedSource[]>(
  'I18N_SHARED_SOURCES',
  { factory: () => [] },
);
