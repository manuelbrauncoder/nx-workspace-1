import { inject, RESPONSE_INIT } from '@angular/core';

/**
 * Returns a function that sets the HTTP status of the server-rendered response, e.g. 404 for a
 * page that does not exist. Without it every rendered page answers with 200. Does nothing in
 * the browser.
 *
 * @example
 * private readonly _setResponseStatus = injectResponseStatus();
 * // ...
 * this._setResponseStatus(404);
 */
export function injectResponseStatus(): (status: number) => void {
  const response = inject(RESPONSE_INIT, { optional: true });
  return (status) => {
    if (response) {
      response.status = status;
    }
  };
}
