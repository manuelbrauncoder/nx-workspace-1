import { EnvironmentProviders, inject, provideAppInitializer } from '@angular/core';
import { AppConfigService } from '@core/config/app-config';
import { AuthStore } from './application/auth.store';

/**
 * Finds out who is signed in before the app starts, so guards and the header know it on the
 * first render, on the server as well. Waits for the runtime config, which holds the URL of the
 * backend.
 */
export function provideAuth(): EnvironmentProviders {
  return provideAppInitializer(async () => {
    const config = inject(AppConfigService);
    const store = inject(AuthStore);
    await config.load();
    await store.getMe();
  });
}
