import { isPlatformBrowser } from '@angular/common';
import {
  computed,
  DOCUMENT,
  effect,
  inject,
  InjectionToken,
  PLATFORM_ID,
  Service,
  signal,
} from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

/** Must match the inline script in index.html. */
export const THEME_STORAGE_KEY = 'theme';

/**
 * Pins an app to one color scheme, e.g. an app designed only in dark. `ThemeService` then
 * ignores the stored choice and `setMode()`, and the app shows no theme toggle. Its
 * `index.html` sets the class on `<html>` itself instead of running the inline script.
 *
 * @example
 * providers: [{ provide: FORCED_THEME_MODE, useValue: 'dark' }]
 */
export const FORCED_THEME_MODE = new InjectionToken<'light' | 'dark' | null>('FORCED_THEME_MODE', {
  factory: () => null,
});

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'system';

@Service()
export class ThemeService {
  private readonly _document = inject(DOCUMENT);
  private readonly _isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly _forced = inject(FORCED_THEME_MODE);

  readonly mode = signal<ThemeMode>(this._forced ?? this._readStoredMode());
  private readonly _systemDark = signal(false);

  readonly resolved = computed<'light' | 'dark'>(() => {
    const mode = this.mode();
    return mode === 'system' ? (this._systemDark() ? 'dark' : 'light') : mode;
  });

  constructor() {
    if (this._isBrowser) {
      const query = this._document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
      if (query) {
        this._systemDark.set(query.matches);
        query.addEventListener('change', (event) => this._systemDark.set(event.matches));
      }
    }

    effect(() => {
      if (this._isBrowser) {
        this._document.documentElement.classList.toggle('dark', this.resolved() === 'dark');
      }
    });
  }

  setMode(mode: ThemeMode): void {
    if (this._forced) {
      return;
    }
    this.mode.set(mode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Storage unavailable (e.g. private mode): the choice only applies to this session.
    }
  }

  private _readStoredMode(): ThemeMode {
    if (!this._isBrowser) {
      return 'system';
    }
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      return isThemeMode(stored) ? stored : 'system';
    } catch {
      return 'system';
    }
  }
}
