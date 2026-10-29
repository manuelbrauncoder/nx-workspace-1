import { inject, Service } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { ROUTE_SEO_KEY, RouteSeo } from './route-seo';
import { SeoService } from './seo.service';

/** Settings of all routes from the root down to the active page, children win. */
function collectSeo(root: ActivatedRouteSnapshot): RouteSeo {
  let seo: RouteSeo = {};
  for (let route: ActivatedRouteSnapshot | null = root; route; route = route.firstChild) {
    // Only the data of the route itself, so the result does not depend on how the router
    // inherits data.
    const own = route.routeConfig?.data?.[ROUTE_SEO_KEY] as RouteSeo | undefined;
    seo = { ...seo, ...own };
  }
  return seo;
}

/**
 * Hands the `title` of the active route, a translation key, and its `routeSeo()` settings to
 * `SeoService` after every navigation.
 */
@Service({ autoProvided: false })
export class SeoTitleStrategy extends TitleStrategy {
  private readonly _seo = inject(SeoService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this._seo.setRoute({
      titleKey: this.buildTitle(snapshot),
      path: snapshot.url.split(/[?#]/)[0],
      seo: collectSeo(snapshot.root),
    });
  }
}
