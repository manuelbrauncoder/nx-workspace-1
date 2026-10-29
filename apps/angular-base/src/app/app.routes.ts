import { Routes } from '@angular/router';
import { routeSeo } from '@core/seo/route-seo';
import { authGuard } from '@features/auth/public-api';
import { AppShell } from './layout/app-shell/app-shell';

export const routes: Routes = [
  {
    path: '',
    component: AppShell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'notes' },
      {
        path: 'showcase',
        loadChildren: () =>
          import('./features/showcase/showcase.routes').then((m) => m.showcaseRoutes),
      },
      {
        path: 'notes',
        // The backend only hands out the notes of the signed-in user.
        canActivate: [authGuard],
        loadChildren: () => import('./features/notes/notes.routes').then((m) => m.notesRoutes),
      },
      {
        // `/sign-in` and `/sign-up`.
        path: '',
        loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
      },
      {
        // Legal pages sit at the top level, e.g. `/impressum`.
        path: '',
        loadChildren: () => import('./features/legal/legal.routes').then((m) => m.legalRoutes),
      },
      {
        // Last, so it only takes what no other route matched. The page answers with status 404.
        path: '**',
        title: 'notFound.title',
        data: routeSeo({ index: false }),
        loadComponent: () => import('./layout/not-found/not-found').then((m) => m.NotFound),
      },
    ],
  },
];
