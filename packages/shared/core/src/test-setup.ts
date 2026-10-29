/** Runs before every spec file, set through `setupFiles` in `vite.config.mts`. */
import '@angular/compiler';
import { APP_NAME } from './app-name';
import { provideI18nTesting } from './i18n/testing/provide-i18n-testing';
import { CORE_TEST_APP_NAME, coreTestDe, coreTestI18n } from './testing/core-test-texts';
import { setupTestEnvironment } from './testing/setup-test-environment';

setupTestEnvironment([
  { provide: APP_NAME, useValue: CORE_TEST_APP_NAME },
  provideI18nTesting({ shared: [coreTestI18n], sharedDe: [coreTestDe] }),
]);
