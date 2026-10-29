import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppConfigService } from '@core/config/app-config';
import { toFailure } from '@core/failure/to-failure';
import { tap } from 'rxjs';
import { AuthStore } from './auth.store';
import { signInUrlTree } from './return-url';

/**
 * Notices that the backend ended the session, e.g. because it expired or an admin revoked it:
 * a request of a signed-in user comes back with 401. The user is then signed out here as well
 * and sent to the sign-in page. Must sit before `failureInterceptor` in the list.
 *
 * The auth endpoints are left out. There a 401 means wrong credentials or nobody signed in.
 */
export const sessionExpiredInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(AppConfigService);
  if (!config.isApiUrl(req.url) || req.url.startsWith(`${config.apiBaseUrl}/auth/`)) {
    return next(req);
  }
  const store = inject(AuthStore);
  const router = inject(Router);
  return next(req).pipe(
    tap({
      error: (error: unknown) => {
        if (store.isSignedIn() && toFailure(error).kind === 'unauthorized') {
          store.clearMe();
          void router.navigateByUrl(signInUrlTree(router, router.url));
        }
      },
    }),
  );
};
