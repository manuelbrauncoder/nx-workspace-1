import { EnvironmentProviders, inject, provideAppInitializer } from '@angular/core';
import { AppConfigService } from './app-config';

/** Loads the runtime config before the app starts. Requires `provideHttpClient()`. */
export function provideAppConfig(): EnvironmentProviders {
  return provideAppInitializer(() => inject(AppConfigService).load());
}
