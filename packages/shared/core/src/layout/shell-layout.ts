import { inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, Data, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

/**
 * How the app shell frames a page. `contained` puts it into the centered page container with
 * space above and below, `full-bleed` lets its sections run across the full width.
 */
export type ShellLayout = 'contained' | 'full-bleed';

/** Key in the `data` of a route that holds its `ShellLayout`. */
export const SHELL_LAYOUT_KEY = 'shellLayout';

/**
 * Builds the `data` of a route that sets the frame of the shell. Combine it with `routeSeo()`.
 * Child routes take over the layout of their parents.
 *
 * @example
 * { path: '', data: { ...routeSeo({ description: '...' }), ...shellLayout('full-bleed') } }
 */
export function shellLayout(layout: ShellLayout): Data {
  return { [SHELL_LAYOUT_KEY]: layout };
}

/** The layout of the deepest route that sets one, `contained` if none does. */
export function shellLayoutOf(snapshot: ActivatedRouteSnapshot): ShellLayout {
  let layout: ShellLayout = 'contained';
  for (let route: ActivatedRouteSnapshot | null = snapshot; route; route = route.firstChild) {
    const value: unknown = route.data[SHELL_LAYOUT_KEY];
    if (value === 'contained' || value === 'full-bleed') {
      layout = value;
    }
  }
  return layout;
}

/** The layout of the current page, updated after each navigation. Call in an injection context. */
export function injectShellLayout(): Signal<ShellLayout> {
  const router = inject(Router);
  return toSignal(
    router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => shellLayoutOf(router.routerState.snapshot.root)),
    ),
    { initialValue: shellLayoutOf(router.routerState.snapshot.root) },
  );
}
