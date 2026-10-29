import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { TitleStrategy } from '@angular/router';
import { SeoTitleStrategy } from './seo-title-strategy';

/** Keeps title and meta tags in step with the active route. Requires the router and i18n. */
export function provideSeo(): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: TitleStrategy, useClass: SeoTitleStrategy }]);
}
