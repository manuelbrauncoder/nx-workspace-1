import { DOCUMENT, inject, Service } from '@angular/core';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { firstValueFrom } from 'rxjs';
import { focusReturnTarget } from '../dialog/focus-return';
import { UiConfirmDialog } from './confirm-dialog';

export interface UiConfirmDialogOptions {
  heading: string;
  description: string;
  /** Label of the confirming button, e.g. "Löschen". */
  confirmLabel: string;
  cancelLabel?: string;
  /** `destructive` for actions that cannot be undone. */
  variant?: 'default' | 'destructive';
}

/**
 * Asks the user to confirm an action in a modal alert dialog. Resolves to `true` only when the
 * confirming button was used, Escape and "Abbrechen" resolve to `false`. Focus starts on
 * "Abbrechen" and returns to the triggering element afterwards.
 *
 * @example
 * private readonly _confirmDialog = inject(UiConfirmDialogService);
 *
 * private async _remove(): Promise<void> {
 *   const confirmed = await this._confirmDialog.confirm({
 *     heading: 'Notiz löschen?',
 *     description: 'Das lässt sich nicht rückgängig machen.',
 *     confirmLabel: 'Löschen',
 *     variant: 'destructive',
 *   });
 *   if (confirmed) {
 *     await this._store.remove(this.id());
 *   }
 * }
 */
@Service()
export class UiConfirmDialogService {
  private readonly _dialog = inject(HlmDialogService);
  private readonly _document = inject(DOCUMENT);

  async confirm(options: UiConfirmDialogOptions): Promise<boolean> {
    const ref = this._dialog.open<boolean>(UiConfirmDialog, {
      context: { data: options },
      // Linked by `app-ui-dialog` once its description is rendered.
      ariaDescribedBy: null,
      role: 'alertdialog',
      closeOnOutsidePointerEvents: false,
      showCloseButton: false,
      restoreFocus: focusReturnTarget(this._document),
    });
    return (await firstValueFrom(ref.closed$, { defaultValue: undefined })) === true;
  }
}
