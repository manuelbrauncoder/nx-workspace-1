import { computed, inject, Service, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { I18nService } from '@core/i18n/i18n.service';
import { asyncState } from '@core/state/async-state';
import { LegalPageName } from '../domain/legal';
import { LegalUseCase } from '../domain/legal.usecase';

/**
 * The legal page that is open, in the active language. Switching the language loads the page
 * again. Provided in the feature routes.
 */
@Service({ autoProvided: false })
export class LegalStore {
  private readonly _useCase = inject(LegalUseCase);
  private readonly _i18n = inject(I18nService);

  /** Nothing is requested before a page opens. */
  private readonly _page = signal<LegalPageName | undefined>(undefined);
  private readonly _content = rxResource({
    params: () => {
      const name = this._page();
      return name && { name, language: this._i18n.language() };
    },
    stream: ({ params }) => this._useCase.getHtml(params.name, params.language),
  });

  // Reading `value()` of a failed resource throws, hence the `hasValue()` guard.
  readonly html = computed(() => (this._content.hasValue() ? this._content.value() : ''));
  readonly state = asyncState(this._content);

  open(name: LegalPageName): void {
    this._page.set(name);
  }

  reload(): void {
    this._content.reload();
  }
}
