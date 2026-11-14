import { Routes } from '@angular/router';
import { loadI18nScope } from '@core/i18n/i18n-scope';
import { routeSeo } from '@core/seo/route-seo';
import { LegalStore } from './application/legal.store';
import { LegalPageName } from './domain/legal';
import { LegalUseCase } from './domain/legal.usecase';
import { legalPageI18n } from './presentation/legal-page/legal-page.i18n';

const loadLegalPage = () => import('./presentation/legal-page/legal-page').then((m) => m.LegalPage);

export const legalRoutes: Routes = [
  {
    path: '',
    // They live as long as the feature. The use case is its only way to the API layer.
    providers: [LegalUseCase, LegalStore],
    // Reachable through the footer, but of no use in a search result. Applies to every child.
    data: routeSeo({ index: false }),
    canActivate: [loadI18nScope(legalPageI18n)],
    children: [
      {
        path: 'imprint',
        title: 'legalPage.titles.imprint',
        data: { page: 'imprint' satisfies LegalPageName },
        loadComponent: loadLegalPage,
      },
      {
        path: 'privacy',
        title: 'legalPage.titles.privacy',
        data: { page: 'privacy' satisfies LegalPageName },
        loadComponent: loadLegalPage,
      },
      {
        path: 'accessibility',
        title: 'legalPage.titles.accessibility',
        data: { page: 'accessibility' satisfies LegalPageName },
        loadComponent: loadLegalPage,
      },
      {
        path: 'cookies',
        title: 'legalPage.titles.cookies',
        data: { page: 'cookies' satisfies LegalPageName },
        loadComponent: loadLegalPage,
      },
    ],
  },
];
