import { Data, LoadChildren, Route, Routes } from '@angular/router';
import { routeSeo } from '@core/seo/route-seo';
import { adminGuard, authGuard } from '@features/auth/public-api';
import { AppShell } from './layout/app-shell/app-shell';
import { GuestShell } from './layout/guest-shell/guest-shell';

/**
 * A page in `GuestShell` at `path`. The feature hangs below as an empty child, which inherits the
 * route parameters and `data` of this entry.
 */
function guestPage(path: string, loadChildren: LoadChildren, data?: Data): Route {
  return {
    path,
    component: GuestShell,
    ...(data ? { data } : {}),
    children: [{ path: '', loadChildren }],
  };
}

export const routes: Routes = [
  {
    // Place cards and the stand card. Outside every shell: the sheets must print alone.
    path: 'events/:id/print',
    canActivate: [authGuard],
    loadChildren: () => import('./features/print/print.routes').then((m) => m.printRoutes),
  },
  // Pages a guest opens through a link, in their own frame without header and sign-in. One entry
  // each, so the frame only takes its own paths: a group under `''` would also take `/`. Before
  // the app shell, whose catch-all would take them otherwise.
  guestPage('rsvp/:token', () => import('./features/rsvp/rsvp.routes').then((m) => m.rsvpRoutes)),
  // The upload page of a guest, the QR code of their place card.
  guestPage(
    'photos/:token',
    () => import('./features/upload/upload.routes').then((m) => m.uploadRoutes),
    { kind: 'guest' },
  ),
  // The shared upload page of the photo stand.
  guestPage(
    'stand/:token',
    () => import('./features/upload/upload.routes').then((m) => m.uploadRoutes),
    { kind: 'stand' },
  ),
  guestPage('save-the-date/:token', () =>
    import('./features/save-the-date/save-the-date.routes').then((m) => m.saveTheDateRoutes),
  ),
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
        // The list, `new` and `:id/edit`. A path it does not know falls through to the frame.
        path: 'events',
        // The backend only hands out the events the signed-in user is a member of.
        canActivate: [authGuard],
        loadChildren: () => import('./features/events/events.routes').then((m) => m.eventsRoutes),
      },
      {
        // One event: its frame with title, actions and tabs, the tab pages below it. Guests,
        // team and photos are features of their own, the frame only links to them.
        path: 'events/:id',
        canActivate: [authGuard],
        // Events are private.
        data: routeSeo({ index: false }),
        loadComponent: () =>
          import('./features/events/presentation/event-frame/event-frame').then(
            (m) => m.EventFrame,
          ),
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadChildren: () =>
              import('./features/events/events.routes').then((m) => m.eventOverviewRoutes),
          },
          {
            path: 'guests',
            loadChildren: () =>
              import('./features/guests/guests.routes').then((m) => m.guestsRoutes),
          },
          {
            path: 'team',
            loadChildren: () => import('./features/team/team.routes').then((m) => m.teamRoutes),
          },
          {
            path: 'photos',
            loadChildren: () =>
              import('./features/photos/photos.routes').then((m) => m.photosRoutes),
          },
        ],
      },
      {
        // Accounts and account links on `/admin/users`, the legal pages on `/admin/legal`.
        path: 'admin',
        canActivate: [adminGuard],
        children: [
          {
            path: 'legal',
            loadChildren: () =>
              import('./features/legal-editor/legal-editor.routes').then(
                (m) => m.legalEditorRoutes,
              ),
          },
          {
            path: '',
            loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes),
          },
        ],
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
