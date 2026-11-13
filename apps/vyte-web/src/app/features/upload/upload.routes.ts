import { Routes } from '@angular/router';
import { loadI18nScope } from '@core/i18n/i18n-scope';
import { routeSeo } from '@core/seo/route-seo';
import { UploadStore } from './application/upload.store';
import { UploadUseCase } from './domain/upload.usecase';
import { uploadPageI18n } from './presentation/upload-page/upload-page.i18n';

/**
 * Mounted at `photos/:token` and `stand/:token` inside `GuestShell` in `app.routes.ts`, each
 * with `data: { kind }`. The empty path inherits `token` and `kind`.
 */
export const uploadRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    providers: [UploadUseCase, UploadStore],
    title: 'uploadPage.title',
    // Personal pages never belong into a search result. The title of the event replaces this
    // one, see `UploadPage`.
    data: routeSeo({ index: false }),
    canActivate: [loadI18nScope(uploadPageI18n)],
    loadComponent: () => import('./presentation/upload-page/upload-page').then((m) => m.UploadPage),
  },
];
