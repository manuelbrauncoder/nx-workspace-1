import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { AsyncContent } from '@shared/async-content/async-content';
import { UiBreadcrumb, UiBreadcrumbItem } from '@shared/ui/breadcrumb/breadcrumb';
import { UiButton } from '@shared/ui/button/button';
import { UiCardImports } from '@shared/ui/card/card';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiText } from '@shared/ui/text/text';
import { PortfolioEditorStore } from '../../application/portfolio-editor.store';
import { PORTFOLIO_SECTIONS } from '../../domain/portfolio';

/** The sections of the start page on `/admin/portfolio`, each with whether it exists yet. */
@Component({
  selector: 'app-section-overview',
  imports: [
    RouterLink,
    TranslatePipe,
    AsyncContent,
    UiBreadcrumb,
    UiButton,
    UiCardImports,
    UiIcon,
    UiText,
  ],
  styleUrl: './section-overview.scss',
  templateUrl: './section-overview.html',
})
export class SectionOverview {
  private readonly _store = inject(PortfolioEditorStore);
  private readonly _breadcrumb: UiBreadcrumbItem[] = [
    { labelKey: 'admin.areas.hub', path: '/admin' },
    { labelKey: 'admin.areas.portfolio' },
  ];

  private readonly _sections = PORTFOLIO_SECTIONS.map((name) => ({
    name,
    titleKey: `portfolioEditor.sections.${name}` as const,
    descriptionKey: `sectionOverview.descriptions.${name}` as const,
  }));
}
