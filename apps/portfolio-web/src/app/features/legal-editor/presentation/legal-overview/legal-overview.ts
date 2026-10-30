import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocalDatePipe } from '@core/i18n/local-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { AsyncContent } from '@shared/async-content/async-content';
import { UiBreadcrumb, UiBreadcrumbItem } from '@shared/ui/breadcrumb/breadcrumb';
import { UiButton } from '@shared/ui/button/button';
import { UiCardImports } from '@shared/ui/card/card';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiText } from '@shared/ui/text/text';
import { LegalEditorStore } from '../../application/legal-editor.store';
import { LEGAL_PAGES } from '../../domain/legal';

/** The legal pages on `/admin/legal`, each with when it was changed last. */
@Component({
  selector: 'app-legal-overview',
  imports: [
    RouterLink,
    LocalDatePipe,
    TranslatePipe,
    AsyncContent,
    UiBreadcrumb,
    UiButton,
    UiCardImports,
    UiIcon,
    UiText,
  ],
  styleUrl: './legal-overview.scss',
  templateUrl: './legal-overview.html',
})
export class LegalOverview {
  private readonly _store = inject(LegalEditorStore);
  private readonly _breadcrumb: UiBreadcrumbItem[] = [
    { labelKey: 'admin.areas.hub', path: '/admin' },
    { labelKey: 'admin.areas.legal' },
  ];

  private readonly _pages = LEGAL_PAGES.map((name) => ({
    name,
    titleKey: `legalEditor.pages.${name}` as const,
  }));
}
