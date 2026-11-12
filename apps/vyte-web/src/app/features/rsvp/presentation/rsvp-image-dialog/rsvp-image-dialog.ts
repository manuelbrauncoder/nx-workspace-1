import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiDialog, UiDialogFooter } from '@shared/ui/dialog/dialog';
import { injectUiDialogData, injectUiDialogRef } from '@shared/ui/dialog/dialog-ref';

export interface RsvpImageDialogData {
  src: string;
  width: number;
  height: number;
  /** Place in the gallery, starting at 1, for the heading. */
  number: number;
  total: number;
}

/** One image of the event, large. Opened from the gallery of the guest page. */
@Component({
  selector: 'app-rsvp-image-dialog',
  imports: [NgOptimizedImage, TranslatePipe, UiButton, UiDialog, UiDialogFooter],
  styleUrl: './rsvp-image-dialog.scss',
  templateUrl: './rsvp-image-dialog.html',
})
export class RsvpImageDialog {
  private readonly _dialogRef = injectUiDialogRef();
  private readonly _image = injectUiDialogData<RsvpImageDialogData>();
}
