import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideAppConfig } from '@core/config/provide-app-config';
import { credentialsInterceptor } from '@core/http/credentials.interceptor';
import { failureInterceptor } from '@core/http/failure.interceptor';
import { languageInterceptor } from '@core/i18n/language.interceptor';
import { provideI18n } from '@core/i18n/provide-i18n';
import { AppErrorHandler } from '@core/log/app-error-handler';
import { provideDeveloperGreeting } from '@core/log/provide-developer-greeting';
import { provideSeo } from '@core/seo/provide-seo';
import { provideAuth, sessionExpiredInterceptor } from '@features/auth/public-api';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
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
    provideI18n(),
    provideSeo(),
    provideDeveloperGreeting(),
  ],
};
