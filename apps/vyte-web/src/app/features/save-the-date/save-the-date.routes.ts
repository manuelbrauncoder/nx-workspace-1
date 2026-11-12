import { Routes } from '@angular/router';
import { loadI18nScope } from '@core/i18n/i18n-scope';
import { routeSeo } from '@core/seo/route-seo';
import { SaveTheDateStore } from './application/save-the-date.store';
import { SaveTheDateUseCase } from './domain/save-the-date.usecase';
import { saveTheDatePageI18n } from './presentation/save-the-date-page/save-the-date-page.i18n';

// Mounted at `save-the-date/:token` inside `GuestShell` in `app.routes.ts`. The empty path
// inherits the `token` of that route.
export const saveTheDateRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    providers: [SaveTheDateUseCase, SaveTheDateStore],
    title: 'saveTheDatePage.title',
    // A shared link never belongs into a search result. The title of the event replaces this
    // one, see `SaveTheDatePage`.
    data: routeSeo({ index: false }),
    canActivate: [loadI18nScope(saveTheDatePageI18n)],
    loadComponent: () =>
      import('./presentation/save-the-date-page/save-the-date-page').then((m) => m.SaveTheDatePage),
  },
];
