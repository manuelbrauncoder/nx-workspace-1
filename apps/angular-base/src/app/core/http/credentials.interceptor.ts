import { HttpInterceptorFn } from '@angular/common/http';
import { inject, REQUEST } from '@angular/core';
import { AppConfigService } from '@core/config/app-config';

/**
 * Sends the session cookie with every request to the backend, and only there. In the browser
 * that is `withCredentials`. The server has no cookie store, so it passes on the cookies of the
 * request it is rendering, which makes a server-rendered page know who is signed in.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  if (!inject(AppConfigService).isApiUrl(req.url)) {
    return next(req);
  }
  const cookie = inject(REQUEST, { optional: true })?.headers.get('cookie');
  return next(
    req.clone({ withCredentials: true, ...(cookie ? { setHeaders: { Cookie: cookie } } : {}) }),
  );
};
