import { Routes } from '@angular/router';
import { routeSeo } from '@core/seo/route-seo';
import { adminGuard, authGuard } from '@features/auth/public-api';
import { AppShell } from './layout/app-shell/app-shell';
import { GuestShell } from './layout/guest-shell/guest-shell';

export const routes: Routes = [
  {
    // Pages a guest opens through a link, in their own frame without header and sign-in. First,
    // so the catch-all of the app shell below does not take them.
    path: '',
    component: GuestShell,
    children: [
      {
        path: 'rsvp/:token',
        loadChildren: () => import('./features/rsvp/rsvp.routes').then((m) => m.rsvpRoutes),
      },
      {
        path: 'save-the-date/:token',
        loadChildren: () =>
          import('./features/save-the-date/save-the-date.routes').then((m) => m.saveTheDateRoutes),
      },
    ],
  },
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
        // Its own feature, before `events`, so that one does not take the path.
        path: 'events/:id/guests',
        canActivate: [authGuard],
        loadChildren: () => import('./features/guests/guests.routes').then((m) => m.guestsRoutes),
      },
      {
        path: 'events/:id/team',
        canActivate: [authGuard],
        loadChildren: () => import('./features/team/team.routes').then((m) => m.teamRoutes),
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
        // An editor invite: accept it, sign in or create an account.
        path: 'invite/:token',
        loadChildren: () => import('./features/invite/invite.routes').then((m) => m.inviteRoutes),
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
