import { Routes } from '@angular/router';
import { loadI18nScope } from '@core/i18n/i18n-scope';
import { routeSeo } from '@core/seo/route-seo';
import { LegalEditorStore } from './application/legal-editor.store';
import { legalPageMatch } from './application/legal-page.guard';
import { LegalEditorUseCase } from './domain/legal-editor.usecase';
import { legalOverviewI18n } from './presentation/legal-overview/legal-overview.i18n';
import { legalPageEditorI18n } from './presentation/legal-page-editor/legal-page-editor.i18n';

export const legalEditorRoutes: Routes = [
  {
    path: '',
    // Both live as long as the feature. The use case is its only way to the API layer.
    providers: [LegalEditorUseCase, LegalEditorStore],
    // Admin pages do not belong into a search result. Applies to every child.
    data: routeSeo({ index: false }),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'legalOverview.title',
        canActivate: [loadI18nScope(legalOverviewI18n)],
        loadComponent: () =>
          import('./presentation/legal-overview/legal-overview').then((m) => m.LegalOverview),
      },
      {
        // The name of the page replaces this title, see `LegalPageEditor`.
        path: ':page',
        title: 'legalPageEditor.title',
        canMatch: [legalPageMatch],
        canActivate: [loadI18nScope(legalPageEditorI18n)],
        loadComponent: () =>
          import('./presentation/legal-page-editor/legal-page-editor').then(
            (m) => m.LegalPageEditor,
          ),
      },
    ],
  },
];
