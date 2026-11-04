import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { APP_NAME } from '@core/app-name';
import { APP_VERSION } from '@core/app-version';
import { provideAppConfig } from '@core/config/provide-app-config';
import { credentialsInterceptor } from '@core/http/credentials.interceptor';
import { failureInterceptor } from '@core/http/failure.interceptor';
import { languageInterceptor } from '@core/i18n/language.interceptor';
import { provideI18n } from '@core/i18n/provide-i18n';
import { AppErrorHandler } from '@core/log/app-error-handler';
import { provideDeveloperGreeting } from '@core/log/provide-developer-greeting';
import { provideSeo } from '@core/seo/provide-seo';
import { provideAuth, sessionExpiredInterceptor } from '@features/auth/public-api';
import { uiI18n } from '@shared/i18n/ui.i18n';
import packageJson from '../../package.json';
import { routes } from './app.routes';
import { appI18n } from './i18n/app.i18n';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: APP_NAME, useValue: 'Manuel Braun' },
    // Kept up to date by `nx release`.
    { provide: APP_VERSION, useValue: packageJson.version },
    { provide: ErrorHandler, useClass: AppErrorHandler },
    provideRouter(
      routes,
      withComponentInputBinding(),
      // A new page starts at the top, going back restores the position, `#fragment` links scroll.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    provideClientHydration(),
    provideHttpClient(
      // A response runs through the list backwards, so `failureInterceptor` comes last: the
      // others then see a `Failure`.
      withInterceptors([
        languageInterceptor,
        credentialsInterceptor,
        sessionExpiredInterceptor,
        failureInterceptor,
      ]),
    ),
    provideAppConfig(),
    provideAuth(),
    provideI18n({ shared: [uiI18n, appI18n] }),
    provideSeo(),
    provideDeveloperGreeting(),
  ],
};
