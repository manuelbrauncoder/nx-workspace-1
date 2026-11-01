import { Component, Signal } from '@angular/core';
import { LocalDatePipe } from '@core/i18n/local-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { AsyncState } from '@core/state/async-state';
import { AsyncContent } from '@shared/async-content/async-content';
import { UiButton } from '@shared/ui/button/button';
import { UiDialog, UiDialogFooter } from '@shared/ui/dialog/dialog';
import { injectUiDialogData, injectUiDialogRef } from '@shared/ui/dialog/dialog-ref';
import { UiEmpty } from '@shared/ui/empty/empty';
import { Media } from '../../domain/portfolio';

/**
 * What the picker shows. Handed over as dialog data, because a dialog does not see the
 * providers of the feature routes.
 */
export interface MediaPickerData {
  media: Signal<Media[]>;
  state: Signal<AsyncState>;
  retry: () => void;
}

/** The uploaded images as a grid. Choosing one closes the dialog with it as the result. */
@Component({
  selector: 'app-media-picker-dialog',
  imports: [
    LocalDatePipe,
    TranslatePipe,
    AsyncContent,
    UiButton,
    UiDialog,
    UiDialogFooter,
    UiEmpty,
  ],
  styleUrl: './media-picker-dialog.scss',
  templateUrl: './media-picker-dialog.html',
})
export class MediaPickerDialog {
  private readonly _dialogRef = injectUiDialogRef<Media>();
  private readonly _data = injectUiDialogData<MediaPickerData>();
}
