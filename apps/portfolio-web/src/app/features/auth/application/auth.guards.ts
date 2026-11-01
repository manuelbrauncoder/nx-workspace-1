import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AppConfigService } from '@core/config/app-config';
import { AuthStore } from './auth.store';
import { RETURN_URL_PARAM, safeReturnUrl, signInUrlTree } from './return-url';

/**
 * Lets only signed-in users through. Everyone else lands on the sign-in page and returns to the
 * requested page afterwards.
 *
 * @example
 * { path: 'notes', canActivate: [authGuard], loadChildren: ... }
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  return inject(AuthStore).isSignedIn() || signInUrlTree(router, state.url);
};

/** Keeps signed-in users away from the sign-in and sign-up page. */
export const guestGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  return (
    !inject(AuthStore).isSignedIn() ||
    router.parseUrl(safeReturnUrl(route.queryParamMap.get(RETURN_URL_PARAM)))
  );
};

/**
 * Keeps the sign-up page closed while `allowSignUp` is off. The backend refuses sign-ups then
 * anyway, the guard sends visitors to the sign-in page instead of a form that cannot work.
 */
export const signUpGuard: CanActivateFn = (route) =>
  inject(AppConfigService).allowSignUp ||
  inject(Router).createUrlTree(['/sign-in'], { queryParams: route.queryParams });

/** Lets only admins through. A signed-in user without admin rights lands on the start page. */
export const adminGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const store = inject(AuthStore);
  if (!store.isSignedIn()) {
    return signInUrlTree(router, state.url);
  }
  return store.isAdmin() || router.parseUrl('/');
};
