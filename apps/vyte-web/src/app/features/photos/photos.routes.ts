import { Routes } from '@angular/router';
import { loadI18nScope } from '@core/i18n/i18n-scope';
import { routeSeo } from '@core/seo/route-seo';
import { PhotosStore } from './application/photos.store';
import { PhotosUseCase } from './domain/photos.usecase';
import { photoListI18n } from './presentation/photo-list/photo-list.i18n';

// Mounted at `events/:id/photos` with `authGuard` in `app.routes.ts`. The empty paths below
// inherit the `id` of that route.
export const photosRoutes: Routes = [
  {
    path: '',
    // Both live as long as the feature. The use case is its only way to the API layer.
    providers: [PhotosUseCase, PhotosStore],
    // Photos of guests are private.
    data: routeSeo({ index: false }),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'photoList.title',
        // The title of the loaded event replaces this one, see `PhotoList`.
        canActivate: [loadI18nScope(photoListI18n)],
        loadComponent: () =>
          import('./presentation/photo-list/photo-list').then((m) => m.PhotoList),
      },
    ],
  },
];
