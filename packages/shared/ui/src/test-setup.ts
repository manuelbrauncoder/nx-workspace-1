/** Runs before every spec file, set through `setupFiles` in `vite.config.mts`. */
import '@angular/compiler';
import { provideI18nTesting } from '@core/i18n/testing/provide-i18n-testing';
import { setupTestEnvironment } from '@core/testing/setup-test-environment';
import uiDe from './i18n/de.json';
import { uiI18n } from './i18n/ui.i18n';

setupTestEnvironment([provideI18nTesting({ shared: [uiI18n], sharedDe: [uiDe] })]);
