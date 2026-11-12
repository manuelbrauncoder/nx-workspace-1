import { Routes } from '@angular/router';
import { loadI18nScope } from '@core/i18n/i18n-scope';
import { routeSeo } from '@core/seo/route-seo';
import { RsvpStore } from './application/rsvp.store';
import { RsvpUseCase } from './domain/rsvp.usecase';
import { rsvpI18n } from './presentation/rsvp/rsvp.i18n';

// Mounted at `rsvp/:token` inside `GuestShell` in `app.routes.ts`. The empty path inherits the
// `token` of that route.
export const rsvpRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    providers: [RsvpUseCase, RsvpStore],
    title: 'rsvp.title',
    // Personal pages never belong into a search result. The title of the event replaces this
    // one, see `Rsvp`.
    data: routeSeo({ index: false }),
    canActivate: [loadI18nScope(rsvpI18n)],
    loadComponent: () => import('./presentation/rsvp/rsvp').then((m) => m.Rsvp),
  },
];
