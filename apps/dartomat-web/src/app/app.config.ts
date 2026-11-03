import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { APP_NAME } from '@core/app-name';
import { APP_VERSION } from '@core/app-version';
import { provideAppConfig } from '@core/config/provide-app-config';
import { failureInterceptor } from '@core/http/failure.interceptor';
import { languageInterceptor } from '@core/i18n/language.interceptor';
import { provideI18n } from '@core/i18n/provide-i18n';
import { AppErrorHandler } from '@core/log/app-error-handler';
import { provideSeo } from '@core/seo/provide-seo';
import { FORCED_THEME_MODE } from '@core/theme/theme.service';
import { uiI18n } from '@shared/i18n/ui.i18n';
import packageJson from '../../package.json';
import { routes } from './app.routes';
import { appI18n } from './i18n/app.i18n';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: APP_NAME, useValue: 'Dartomat' },
    // Kept up to date by `nx release`.
    { provide: APP_VERSION, useValue: packageJson.version },
    // Designed for dark only, there is no theme toggle.
    { provide: FORCED_THEME_MODE, useValue: 'dark' },
    { provide: ErrorHandler, useClass: AppErrorHandler },
    provideRouter(
      routes,
      withComponentInputBinding(),
      // A new page starts at the top, going back restores the position.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    provideClientHydration(),
    provideHttpClient(
      // A response runs through the list backwards, so `failureInterceptor` comes last: the
      // others then see a `Failure`. No credentials: the API has no sign-in.
      withInterceptors([languageInterceptor, failureInterceptor]),
    ),
    provideAppConfig(),
    provideI18n({ shared: [uiI18n, appI18n] }),
    provideSeo(),
  ],
};
