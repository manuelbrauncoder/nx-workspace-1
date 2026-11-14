import { Routes } from '@angular/router';
import { loadI18nScope } from '@core/i18n/i18n-scope';
import { routeSeo } from '@core/seo/route-seo';
import { TeamStore } from './application/team.store';
import { TeamUseCase } from './domain/team.usecase';
import { teamPageI18n } from './presentation/team-page/team-page.i18n';

// Mounted at `team` below the frame of an event (`events/:id`, with `authGuard`) in
// `app.routes.ts`. The routes below inherit its `id` (`paramsInheritanceStrategy: 'always'`).
export const teamRoutes: Routes = [
  {
    path: '',
    // Both live as long as the feature. The use case is its only way to the API layer.
    providers: [TeamUseCase, TeamStore],
    // Teams are private.
    data: routeSeo({ index: false }),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'teamPage.title',
        // The title of the loaded event replaces this one, see `TeamPage`.
        canActivate: [loadI18nScope(teamPageI18n)],
        loadComponent: () => import('./presentation/team-page/team-page').then((m) => m.TeamPage),
      },
    ],
  },
];
