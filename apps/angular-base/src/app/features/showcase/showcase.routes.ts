import { Routes } from '@angular/router';
import { loadI18nScope } from '@core/i18n/i18n-scope';
import { routeSeo } from '@core/seo/route-seo';
import { showcaseColorsI18n } from './presentation/colors/colors.i18n';
import { showcaseComponentsI18n } from './presentation/components/components.i18n';
import { showcaseFormsI18n } from './presentation/forms/forms.i18n';
import { showcaseHubI18n } from './presentation/hub/hub.i18n';
import { ShowcaseShell } from './presentation/showcase-shell/showcase-shell';
import { showcaseShellI18n } from './presentation/showcase-shell/showcase-shell.i18n';
import { showcaseTypographyI18n } from './presentation/typography/typography.i18n';

export const showcaseRoutes: Routes = [
  {
    path: '',
    component: ShowcaseShell,
    // The shell is the layout of all showcase pages and has a scope of its own.
    canActivate: [loadI18nScope(showcaseShellI18n)],
    // Internal pages, applies to every child route.
    data: routeSeo({ index: false }),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'showcaseHub.title',
        canActivate: [loadI18nScope(showcaseHubI18n)],
        loadComponent: () => import('./presentation/hub/hub').then((m) => m.Hub),
      },
      {
        path: 'typography',
        title: 'showcaseTypography.title',
        canActivate: [loadI18nScope(showcaseTypographyI18n)],
        loadComponent: () =>
          import('./presentation/typography/typography').then((m) => m.Typography),
      },
      {
        path: 'colors',
        title: 'showcaseColors.title',
        canActivate: [loadI18nScope(showcaseColorsI18n)],
        loadComponent: () => import('./presentation/colors/colors').then((m) => m.Colors),
      },
      {
        path: 'forms',
        title: 'showcaseForms.title',
        canActivate: [loadI18nScope(showcaseFormsI18n)],
        loadComponent: () => import('./presentation/forms/forms').then((m) => m.Forms),
      },
      {
        path: 'components',
        title: 'showcaseComponents.title',
        canActivate: [loadI18nScope(showcaseComponentsI18n)],
        loadComponent: () =>
          import('./presentation/components/components').then((m) => m.Components),
      },
    ],
  },
];
