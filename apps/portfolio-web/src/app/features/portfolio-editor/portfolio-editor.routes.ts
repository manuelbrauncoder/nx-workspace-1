import { Routes } from '@angular/router';
import { loadI18nScope } from '@core/i18n/i18n-scope';
import { routeSeo } from '@core/seo/route-seo';
import { PortfolioEditorStore } from './application/portfolio-editor.store';
import { portfolioSectionMatch } from './application/portfolio-section.guard';
import { PortfolioEditorUseCase } from './domain/portfolio-editor.usecase';
import { sectionEditorI18n } from './presentation/section-editor/section-editor.i18n';
import { sectionOverviewI18n } from './presentation/section-overview/section-overview.i18n';

export const portfolioEditorRoutes: Routes = [
  {
    path: '',
    // Both live as long as the feature. The use case is its only way to the API layer.
    providers: [PortfolioEditorUseCase, PortfolioEditorStore],
    // Admin pages do not belong into a search result. Applies to every child.
    data: routeSeo({ index: false }),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'sectionOverview.title',
        canActivate: [loadI18nScope(sectionOverviewI18n)],
        loadComponent: () =>
          import('./presentation/section-overview/section-overview').then((m) => m.SectionOverview),
      },
      {
        // The name of the section replaces this title, see `SectionEditor`.
        path: ':section',
        title: 'sectionEditor.title',
        canMatch: [portfolioSectionMatch],
        canActivate: [loadI18nScope(sectionEditorI18n)],
        loadComponent: () =>
          import('./presentation/section-editor/section-editor').then((m) => m.SectionEditor),
      },
    ],
  },
];
