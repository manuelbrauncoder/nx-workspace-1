import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiDialog, UiDialogFooter } from '@shared/ui/dialog/dialog';
import { injectUiDialogData, injectUiDialogRef } from '@shared/ui/dialog/dialog-ref';

export interface PhotoDialogData {
  src: string;
  width: number;
  height: number;
  /** Heading of the dialog, e.g. who took the photo. */
  heading: string;
  /** Second line under the heading, e.g. how and when it came in. */
  description: string;
}

/** One photo of the event, large. Opened from the photo page of the hosts. */
@Component({
  selector: 'app-photo-dialog',
  imports: [NgOptimizedImage, TranslatePipe, UiButton, UiDialog, UiDialogFooter],
  styleUrl: './photo-dialog.scss',
  templateUrl: './photo-dialog.html',
})
export class PhotoDialog {
  private readonly _dialogRef = injectUiDialogRef();
  private readonly _photo = injectUiDialogData<PhotoDialogData>();
}
