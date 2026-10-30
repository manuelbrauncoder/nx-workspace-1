import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';
import { EnvironmentProviders, Provider } from '@angular/core';

/**
 * Sets up the zoneless test bed for every spec of a project. Called from the `src/test-setup.ts`
 * of each project with the providers all of its tests need.
 *
 * @example
 * setupTestEnvironment([provideI18nTesting({ shared: [uiI18n], sharedDe: [uiDe] })]);
 */
export function setupTestEnvironment(providers: (Provider | EnvironmentProviders)[] = []): void {
  // The DOM of the test environment has no `matchMedia`, which UI libraries call without
  // checking. This stand-in never matches, so tests see the light color scheme and no reduced
  // motion.
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

  setupTestBed({ zoneless: true, providers });
}
