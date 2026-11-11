import { Routes } from '@angular/router';
import { loadI18nScope } from '@core/i18n/i18n-scope';
import { routeSeo } from '@core/seo/route-seo';
import { legalAccessibilityI18n } from './presentation/accessibility/accessibility.i18n';
import { legalImprintI18n } from './presentation/imprint/imprint.i18n';
import { legalPrivacyI18n } from './presentation/privacy/privacy.i18n';

export const legalRoutes: Routes = [
  {
    path: '',
    // Reachable through the footer, but of no use in a search result. Applies to every child.
    data: routeSeo({ index: false }),
    children: [
      {
        path: 'imprint',
        title: 'legalImprint.title',
        canActivate: [loadI18nScope(legalImprintI18n)],
        loadComponent: () => import('./presentation/imprint/imprint').then((m) => m.Imprint),
      },
      {
        path: 'privacy',
        title: 'legalPrivacy.title',
        canActivate: [loadI18nScope(legalPrivacyI18n)],
        loadComponent: () => import('./presentation/privacy/privacy').then((m) => m.Privacy),
      },
      {
        path: 'accessibility',
        title: 'legalAccessibility.title',
        canActivate: [loadI18nScope(legalAccessibilityI18n)],
        loadComponent: () =>
          import('./presentation/accessibility/accessibility').then((m) => m.Accessibility),
      },
    ],
  },
];
