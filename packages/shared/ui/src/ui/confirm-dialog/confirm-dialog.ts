import { Component } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '../button/button';
import { UiDialog, UiDialogFooter } from '../dialog/dialog';
import { injectUiDialogData, injectUiDialogRef } from '../dialog/dialog-ref';
import type { UiConfirmDialogOptions } from './confirm-dialog.service';

/** @internal Content of the dialog opened by `UiConfirmDialogService.confirm()`. */
@Component({
  selector: 'app-ui-confirm-dialog',
  imports: [TranslatePipe, UiButton, UiDialog, UiDialogFooter],
  styleUrl: './confirm-dialog.scss',
  templateUrl: './confirm-dialog.html',
})
export class UiConfirmDialog {
  private readonly _options = injectUiDialogData<UiConfirmDialogOptions>();
  private readonly _dialogRef = injectUiDialogRef<boolean>();
}
