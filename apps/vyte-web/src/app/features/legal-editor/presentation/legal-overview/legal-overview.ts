import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocalDatePipe } from '@core/i18n/local-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { AsyncContent } from '@shared/async-content/async-content';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiListImports } from '@shared/ui/list/list';
import { UiTabNav, UiTabNavItem } from '@shared/ui/tab-nav/tab-nav';
import { UiText } from '@shared/ui/text/text';
import { LegalEditorStore } from '../../application/legal-editor.store';
import { LEGAL_PAGES } from '../../domain/legal';

/**
 * The legal pages on `/admin/legal`, each with when it was changed last, below the tabs of the
 * admin area.
 */
@Component({
  selector: 'app-legal-overview',
  imports: [
    RouterLink,
    LocalDatePipe,
    TranslatePipe,
    AsyncContent,
    UiButton,
    UiIcon,
    UiListImports,
    UiTabNav,
    UiText,
  ],
  styleUrl: './legal-overview.scss',
  templateUrl: './legal-overview.html',
})
export class LegalOverview {
  private readonly _store = inject(LegalEditorStore);

  /** The same tabs as on the accounts page, which lives in another feature. */
  private readonly _tabs: UiTabNavItem[] = [
    { labelKey: 'admin.tabs.accounts', path: '/admin/users' },
    { labelKey: 'admin.tabs.legal', path: '/admin/legal' },
  ];

  private readonly _pages = LEGAL_PAGES.map((name) => ({
    name,
    titleKey: `legalEditor.pages.${name}` as const,
  }));
}
