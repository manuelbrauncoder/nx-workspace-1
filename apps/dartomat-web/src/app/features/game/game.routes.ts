import { Routes } from '@angular/router';
import { loadI18nScope } from '@core/i18n/i18n-scope';
import { routeSeo } from '@core/seo/route-seo';
import { GameStore } from './application/game.store';
import { GameUseCase } from './domain/game.usecase';
import { gamePageI18n } from './presentation/game-page/game-page.i18n';

export const gameRoutes: Routes = [
  {
    path: ':id',
    // Both live as long as the feature. The use case is its only way to the API layer.
    providers: [GameUseCase, GameStore],
    title: 'gamePage.title',
    // A game is only reachable through its link, it does not belong into a search result.
    data: routeSeo({ index: false }),
    canActivate: [loadI18nScope(gamePageI18n)],
    loadComponent: () => import('./presentation/game-page/game-page').then((m) => m.GamePage),
  },
];
