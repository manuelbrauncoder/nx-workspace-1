import { Routes } from '@angular/router';
import { loadI18nScope } from '@core/i18n/i18n-scope';
import { routeSeo } from '@core/seo/route-seo';
import { GuestsStore } from './application/guests.store';
import { GuestsUseCase } from './domain/guests.usecase';
import { guestListI18n } from './presentation/guest-list/guest-list.i18n';

// Mounted at `events/:id/guests` with `authGuard` in `app.routes.ts`. The empty paths below
// inherit the `id` of that route.
export const guestsRoutes: Routes = [
  {
    path: '',
    // Both live as long as the feature. The use case is its only way to the API layer.
    providers: [GuestsUseCase, GuestsStore],
    // Guest lists are private.
    data: routeSeo({ index: false }),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'guestList.title',
        // The title of the loaded event replaces this one, see `GuestList`.
        canActivate: [loadI18nScope(guestListI18n)],
        loadComponent: () =>
          import('./presentation/guest-list/guest-list').then((m) => m.GuestList),
      },
    ],
  },
];
