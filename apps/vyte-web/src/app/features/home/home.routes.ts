import { Routes } from '@angular/router';
import { loadI18nScope } from '@core/i18n/i18n-scope';
import { routeSeo } from '@core/seo/route-seo';
import { visitorsOnlyGuard } from './home.guards';
import { homeI18n } from './presentation/home/home.i18n';

export const homeRoutes: Routes = [
  {
    path: '',
    title: 'home.title',
    // The only page of the app a search engine may list.
    data: routeSeo({ description: 'home.description' }),
    canActivate: [visitorsOnlyGuard, loadI18nScope(homeI18n)],
    loadComponent: () => import('./presentation/home/home').then((m) => m.Home),
  },
];
