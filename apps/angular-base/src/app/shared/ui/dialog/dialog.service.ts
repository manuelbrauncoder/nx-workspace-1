import { inject, Service, Type } from '@angular/core';
import { I18nService } from '@core/i18n/i18n.service';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { toUiDialogRef, UiDialogRef } from './dialog-ref';

export interface UiDialogOptions<TData = unknown> {
  /** Handed to the dialog component, read there with `injectUiDialogData()`. */
  data?: TData;
  /** `false` hides the close button in the corner. Escape and a click outside still close. */
  closeButton?: boolean;
}

/**
 * Opens a component as a modal dialog. The component builds its content with `app-ui-dialog`,
 * reads its input with `injectUiDialogData()` and closes itself through `injectUiDialogRef()`.
 * For a plain yes/no question use `UiConfirmDialogService` instead.
 *
 * @example
 * private readonly _dialog = inject(UiDialogService);
 *
 * private async _rename(note: Note): Promise<void> {
 *   const ref = this._dialog.open<string, Note>(RenameNoteDialog, { data: note });
 *   const title = await ref.closed;
 *   if (title !== undefined) {
 *     await this._store.rename(note.id, title);
 *   }
 * }
 */
@Service()
export class UiDialogService {
  private readonly _dialog = inject(HlmDialogService);
  private readonly _i18n = inject(I18nService);

  open<TResult = void, TData = unknown>(
    component: Type<unknown>,
    options: UiDialogOptions<TData> = {},
  ): UiDialogRef<TResult> {
    return toUiDialogRef(
      this._dialog.open<TResult>(component, {
        context: { data: options.data },
        // Linked by `app-ui-dialog` once its description is rendered.
        ariaDescribedBy: null,
        showCloseButton: options.closeButton ?? true,
        closeLabel: this._i18n.translate('common.close'),
      }),
    );
  }
}
