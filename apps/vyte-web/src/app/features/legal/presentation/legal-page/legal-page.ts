import { Component, computed, effect, inject, input } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { AsyncContent } from '@shared/async-content/async-content';
import { UiRichText } from '@shared/ui/rich-text/rich-text';
import { UiText } from '@shared/ui/text/text';
import { LegalStore } from '../../application/legal.store';
import { LegalPageName } from '../../domain/legal';

/**
 * One legal page: the heading of the app and the content from the backend, in a column narrow
 * enough to read long text. Serves every route of the feature.
 */
@Component({
  selector: 'app-legal-page',
  imports: [TranslatePipe, AsyncContent, UiRichText, UiText],
  styleUrl: './legal-page.scss',
  templateUrl: './legal-page.html',
})
export class LegalPage {
  /** From the `data` of the route, bound through `withComponentInputBinding()`. */
  readonly page = input.required<LegalPageName>();

  private readonly _store = inject(LegalStore);
  private readonly _headingKey = computed(() => `legalPage.headings.${this.page()}` as const);

  constructor() {
    effect(() => this._store.open(this.page()));
  }
}
