/**
 * Runs before every spec file, set through `setupFiles` in `vite.config.mts`.
 *
 * Sets up the zoneless test bed with the providers every test needs.
 */
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';
import '@angular/compiler';
import { provideI18nTesting } from '@core/i18n/testing/provide-i18n-testing';

/**
 * The DOM of the test environment has no `matchMedia`, which UI libraries call without checking.
 * This stand-in never matches, so tests see the light color scheme and no reduced motion.
 */
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  });
}

setupTestBed({ zoneless: true, providers: [provideI18nTesting()] });
