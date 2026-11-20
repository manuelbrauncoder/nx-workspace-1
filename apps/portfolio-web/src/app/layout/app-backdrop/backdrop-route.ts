import { inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, Data, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

/** Key in the `data` of a route that turns the gradient backdrop on. */
const BACKDROP_KEY = 'appBackdrop';

/**
 * Builds the `data` of a route whose pages show the animated gradient backdrop: the public pages
 * (start page, legal pages, 404). Child routes take it over. Set in `app.routes.ts`, so the
 * layout knows no features.
 *
 * @example
 * { path: '', data: withBackdrop(), loadChildren: () => import('...') }
 */
export function withBackdrop(): Data {
  return { [BACKDROP_KEY]: true };
}

/** Whether a route of the active chain turns the backdrop on. */
export function hasBackdrop(snapshot: ActivatedRouteSnapshot): boolean {
  for (let route: ActivatedRouteSnapshot | null = snapshot; route; route = route.firstChild) {
    if (route.data[BACKDROP_KEY] === true) {
      return true;
    }
  }
  return false;
}

/** Whether the current page shows the backdrop, updated after each navigation. */
export function injectBackdrop(): Signal<boolean> {
  const router = inject(Router);
  return toSignal(
    router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => hasBackdrop(router.routerState.snapshot.root)),
    ),
    { initialValue: hasBackdrop(router.routerState.snapshot.root) },
  );
}
