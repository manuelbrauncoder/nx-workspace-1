import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '@features/auth/public-api';

/** The start page is for visitors. A signed-in user goes straight to their events. */
export const visitorsOnlyGuard: CanActivateFn = () =>
  !inject(AuthStore).isSignedIn() || inject(Router).parseUrl('/events');
