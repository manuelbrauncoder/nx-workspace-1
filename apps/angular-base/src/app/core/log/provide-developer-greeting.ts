import { isPlatformBrowser } from '@angular/common';
import { APP_BOOTSTRAP_LISTENER, inject, PLATFORM_ID, Provider } from '@angular/core';
import { AppConfigService } from '../config/app-config';
import { AppLog } from './app-log';

/**
 * Greets developers in the browser console once the app has started. It runs after the config
 * was loaded and is skipped during server rendering, so it does not show up in the server output.
 */
export function provideDeveloperGreeting(): Provider {
  return {
    provide: APP_BOOTSTRAP_LISTENER,
    multi: true,
    useFactory: () => {
      const config = inject(AppConfigService);
      const log = inject(AppLog);
      const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

      return () => {
        if (isBrowser) {
          log.info(
            `👋 Hello developer, welcome to angular-base! ` +
              `Environment: ${config.environment}, log level: ${config.logLevel}.`,
          );
        }
      };
    },
  };
}
