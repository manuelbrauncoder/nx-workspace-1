import { Routes } from '@angular/router';
import { loadI18nScope } from '@core/i18n/i18n-scope';
import { routeSeo } from '@core/seo/route-seo';
import { PrintStore } from './application/print.store';
import { PrintUseCase } from './domain/print.usecase';
import { printPageI18n } from './presentation/print-page/print-page.i18n';

// Mounted at `events/:id/print` with `authGuard` in `app.routes.ts`, outside the app shell: the
// printed sheets must not carry a header or footer. The empty path inherits the `id`.
export const printRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    providers: [PrintUseCase, PrintStore],
    title: 'printPage.title',
    // The title of the loaded event replaces this one, see `PrintPage`.
    data: routeSeo({ index: false }),
    canActivate: [loadI18nScope(printPageI18n)],
    loadComponent: () => import('./presentation/print-page/print-page').then((m) => m.PrintPage),
  },
];
