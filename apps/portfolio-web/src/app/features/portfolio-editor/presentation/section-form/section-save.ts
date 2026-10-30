import { inject } from '@angular/core';
import { I18nService } from '@core/i18n/i18n.service';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { PortfolioEditorStore } from '../../application/portfolio-editor.store';
import { PortfolioSectionName, PortfolioSections } from '../../domain/portfolio';

/** Path of the editor, the overview of all sections. */
export const EDITOR_PATH = '/admin/portfolio';

/**
 * Saves a section from its form and confirms it with a toast. A failure is shown by
 * `app-section-form-footer`. Call it in the field initializer of a form component.
 *
 * @example
 * private readonly _save = injectSectionSave('hero');
 * form(this._model, rules, { submission: { action: () => this._save(fromForm(this._model())) } });
 */
export function injectSectionSave<K extends PortfolioSectionName>(
  name: K,
): (value: PortfolioSections[K]) => Promise<void> {
  const store = inject(PortfolioEditorStore);
  const toast = inject(UiToastService);
  const i18n = inject(I18nService);
  return async (value) => {
    if (await store.save(name, value)) {
      toast.success(i18n.translate('sectionEditor.saved'));
    }
  };
}

/** The list with the item at `index` moved one place up (`-1`) or down (`1`). */
export function moveItem<T>(items: readonly T[], index: number, offset: -1 | 1): T[] {
  const target = index + offset;
  if (target < 0 || target >= items.length) {
    return [...items];
  }
  const moved = [...items];
  [moved[index], moved[target]] = [moved[target], moved[index]];
  return moved;
}
