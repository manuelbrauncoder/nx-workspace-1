import { Data } from '@angular/router';
import { TranslationKey } from '@core/i18n/translation-key';

/** Search engine settings of a route. The title stays in the `title` of the route. */
export interface RouteSeo {
  /** Key of the meta description. Without one the page gets the default description of the app. */
  description?: TranslationKey;
  /** `false` keeps the page out of search engines, e.g. forms and internal pages. */
  index?: boolean;
  /** Path of the preview image for shared links, e.g. `/og-notes.png`. Defaults to the app image. */
  image?: string;
}

/** Key in the `data` of a route that holds its `RouteSeo`. */
export const ROUTE_SEO_KEY = 'seo';

/**
 * Builds the `data` of a route from its search engine settings. Child routes take over the
 * settings of their parents and replace single values.
 *
 * @example
 * {
 *   path: '',
 *   title: 'productsList.title',
 *   data: routeSeo({ description: 'productsList.description' }),
 *   loadComponent: ...
 * }
 */
export function routeSeo(seo: RouteSeo): Data {
  return { [ROUTE_SEO_KEY]: seo };
}
