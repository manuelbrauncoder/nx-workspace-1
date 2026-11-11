import { Router, UrlTree } from '@angular/router';

export const SIGN_IN_PATH = '/sign-in';

/** Query parameter of the sign-in page that holds the page to go to afterwards. */
export const RETURN_URL_PARAM = 'returnUrl';

const FALLBACK_URL = '/';

/**
 * The page to go to after signing in. The value comes from the URL and is not trustworthy, so
 * only a path inside the app is accepted. `//host` and `/\host` would leave it.
 */
export function safeReturnUrl(value: string | null | undefined): string {
  return value && /^\/(?![/\\])/.test(value) ? value : FALLBACK_URL;
}

/** The sign-in page, remembering where the user wanted to go. */
export function signInUrlTree(router: Router, returnUrl: string): UrlTree {
  return router.createUrlTree([SIGN_IN_PATH], {
    queryParams: returnUrl === FALLBACK_URL ? {} : { [RETURN_URL_PARAM]: returnUrl },
  });
}
