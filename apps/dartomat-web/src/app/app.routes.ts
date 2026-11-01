import { Routes } from '@angular/router';
import { routeSeo } from '@core/seo/route-seo';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'setup' },
  {
    // Choosing the players and starting a game.
    path: 'setup',
    loadChildren: () => import('./features/setup/setup.routes').then((m) => m.setupRoutes),
  },
  {
    // A running game under `/game/:id`. Whoever has the link can play along.
    path: 'game',
    loadChildren: () => import('./features/game/game.routes').then((m) => m.gameRoutes),
  },
  {
    // Last, so it only takes what no other route matched. The page answers with status 404.
    path: '**',
    title: 'notFound.title',
    data: routeSeo({ index: false }),
    loadComponent: () => import('./layout/not-found/not-found').then((m) => m.NotFound),
  },
];
