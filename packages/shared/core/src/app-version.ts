import { InjectionToken } from '@angular/core';

/**
 * Version of the running app, e.g. `1.2.0`. Every app sets it in its `app.config.ts` from its
 * `package.json`, which `nx release` keeps up to date. Empty when an app does not set it.
 *
 * @example
 * import packageJson from '../../package.json';
 * { provide: APP_VERSION, useValue: packageJson.version }
 */
export const APP_VERSION = new InjectionToken<string>('APP_VERSION', { factory: () => '' });
