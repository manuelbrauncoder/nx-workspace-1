import { computed, inject, Service } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Localized } from '@core/i18n/localized';
import { asyncState } from '@core/state/async-state';
import { mutation } from '@core/state/mutation';
import { patchResource } from '@core/state/patch-resource';
import { LegalPageName } from '../domain/legal';
import { LegalEditorUseCase } from '../domain/legal-editor.usecase';

/**
 * State of the editor of the legal pages. Provided in the feature routes, so it lives as long as
 * the feature. Holds every page in every language, as the form edits both at once.
 */
@Service({ autoProvided: false })
export class LegalEditorStore {
  private readonly _useCase = inject(LegalEditorUseCase);

  private readonly _pages = rxResource({ stream: () => this._useCase.getAll() });
  private readonly _mutation = mutation();

  // Reading `value()` of a failed resource throws, hence the `hasValue()` guard.
  readonly pages = computed(() => (this._pages.hasValue() ? this._pages.value() : undefined));
  readonly state = asyncState(this._pages);

  /** State of the most recent save. */
  readonly mutationState = this._mutation.state;

  reload(): void {
    this._pages.reload();
  }

  /** Replaces both languages of the page; the backend creates a page that does not exist yet. */
  async save(name: LegalPageName, html: Localized<string>): Promise<boolean> {
    const saved = await this._mutation.run(this._useCase.update(name, html));
    if (saved) {
      patchResource(this._pages, (pages) => pages && { ...pages, [name]: saved });
    }
    return saved !== undefined;
  }

  /** Drops the failure of an earlier save, e.g. when another page is opened. */
  resetMutation(): void {
    this._mutation.reset();
  }
}
