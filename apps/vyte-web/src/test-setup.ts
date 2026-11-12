/** Runs before every spec file, set through `setupFiles` in `vite.config.mts`. */
import '@angular/compiler';
import { APP_NAME } from '@core/app-name';
import { provideI18nTesting } from '@core/i18n/testing/provide-i18n-testing';
import { setupTestEnvironment } from '@core/testing/setup-test-environment';
import uiDe from '@shared/i18n/de.json';
import { uiI18n } from '@shared/i18n/ui.i18n';
import { registerAccessibilityMatcher } from '@shared/testing/accessibility';
import { appI18n } from './app/i18n/app.i18n';
import appDe from './app/i18n/de.json';

setupTestEnvironment([
  { provide: APP_NAME, useValue: 'Vyte' },
  provideI18nTesting({ shared: [uiI18n, appI18n], sharedDe: [uiDe, appDe] }),
]);

registerAccessibilityMatcher();
