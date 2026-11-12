import { Routes } from '@angular/router';
import { loadI18nScope } from '@core/i18n/i18n-scope';
import { routeSeo } from '@core/seo/route-seo';
import { InviteStore } from './application/invite.store';
import { InviteUseCase } from './domain/invite.usecase';
import { invitePageI18n } from './presentation/invite-page/invite-page.i18n';

// Mounted at `invite/:token` in `app.routes.ts`, without a guard: the page shows accepting to a
// signed-in user and signing in or up to everyone else. The empty path inherits the `token`.
export const inviteRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    providers: [InviteUseCase, InviteStore],
    title: 'invitePage.title',
    // A personal link never belongs into a search result. The title of the event replaces this
    // one, see `InvitePage`.
    data: routeSeo({ index: false }),
    canActivate: [loadI18nScope(invitePageI18n)],
    loadComponent: () => import('./presentation/invite-page/invite-page').then((m) => m.InvitePage),
  },
];
