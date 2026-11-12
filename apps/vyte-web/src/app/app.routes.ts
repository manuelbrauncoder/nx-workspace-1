import { Routes } from '@angular/router';
import { routeSeo } from '@core/seo/route-seo';
import { adminGuard, authGuard } from '@features/auth/public-api';
import { AppShell } from './layout/app-shell/app-shell';

export const routes: Routes = [
  {
    path: '',
    component: AppShell,
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadChildren: () => import('./features/home/home.routes').then((m) => m.homeRoutes),
      },
      {
        path: 'events',
        // The backend only hands out the events the signed-in user is a member of.
        canActivate: [authGuard],
        loadChildren: () => import('./features/events/events.routes').then((m) => m.eventsRoutes),
      },
      {
        // Accounts and account links, `/admin/users`.
        path: 'admin',
        canActivate: [adminGuard],
        loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes),
      },
      {
        // `/sign-in` and `/welcome/:token`.
        path: '',
        loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
      },
      {
        // Legal pages sit at the top level, e.g. `/imprint`.
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
