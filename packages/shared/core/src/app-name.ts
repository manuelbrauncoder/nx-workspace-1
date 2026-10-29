import { InjectionToken } from '@angular/core';

/**
 * Name of the app as shown in the header, the footer, the page title and the developer greeting.
 * Every app sets it in its `app.config.ts`.
 *
 * @example
 * { provide: APP_NAME, useValue: 'angular-base' }
 */
export const APP_NAME = new InjectionToken<string>('APP_NAME');
