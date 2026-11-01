import { Routes } from '@angular/router';
import { loadI18nScope } from '@core/i18n/i18n-scope';
import { routeSeo } from '@core/seo/route-seo';
import { RecentPlayers } from './application/recent-players';
import { SetupStore } from './application/setup.store';
import { SetupUseCase } from './domain/setup.usecase';
import { setupPageI18n } from './presentation/setup-page/setup-page.i18n';

export const setupRoutes: Routes = [
  {
    path: '',
    // All of them live as long as the feature. The use case is its only way to the API layer.
    providers: [SetupUseCase, SetupStore, RecentPlayers],
    title: 'setupPage.title',
    data: routeSeo({ description: 'setupPage.description' }),
    canActivate: [loadI18nScope(setupPageI18n)],
    loadComponent: () => import('./presentation/setup-page/setup-page').then((m) => m.SetupPage),
  },
];
