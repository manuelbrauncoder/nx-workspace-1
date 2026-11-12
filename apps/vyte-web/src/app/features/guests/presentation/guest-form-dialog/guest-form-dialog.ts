import { Component, computed, inject, signal } from '@angular/core';
import {
  form,
  FormField,
  FormRoot,
  max,
  maxLength,
  min,
  pattern,
  required,
} from '@angular/forms/signals';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { FormStepper } from '@shared/form-controls/form-stepper/form-stepper';
import { FormText } from '@shared/form-controls/form-text/form-text';
import { FormTextarea } from '@shared/form-controls/form-textarea/form-textarea';
import { UiButton } from '@shared/ui/button/button';
import { UiDialog, UiDialogFooter } from '@shared/ui/dialog/dialog';
import { injectUiDialogData, injectUiDialogRef } from '@shared/ui/dialog/dialog-ref';
import {
  Guest,
  GUEST_COMPANIONS_MAX,
  GUEST_NAME_MAX_LENGTH,
  GUEST_NOTE_MAX_LENGTH,
  GuestDraft,
} from '../../domain/guest';
import { GuestDialogData } from '../guest-dialog-data';

/** Without `guest` the dialog adds one, with it the dialog edits that guest. */
export interface GuestFormDialogData extends GuestDialogData<GuestDraft, Guest> {
  guest?: Guest;
}

/** Name, allowance and note of a guest. Closes with the saved guest. */
@Component({
  selector: 'app-guest-form-dialog',
  imports: [
    FormField,
    FormRoot,
    TranslatePipe,
    FailureAlert,
    FormStepper,
    FormText,
    FormTextarea,
    UiButton,
    UiDialog,
    UiDialogFooter,
  ],
  styleUrl: './guest-form-dialog.scss',
  templateUrl: './guest-form-dialog.html',
})
export class GuestFormDialog {
  private readonly _dialogRef = injectUiDialogRef<Guest>();
  private readonly _data = injectUiDialogData<GuestFormDialogData>();
  private readonly _i18n = inject(I18nService);

  private readonly _guest = this._data.guest;
  private readonly _saving = computed(() => this._data.state().loadingState === 'loading');
  private readonly _failure = computed(() => this._data.state().failure);

  private readonly _model = signal<GuestDraft>({
    name: this._guest?.name ?? '',
    note: this._guest?.note ?? '',
    maxCompanions: this._guest?.maxCompanions ?? 0,
  });

  private readonly _guestForm = form(
    this._model,
    (path) => {
      const t = this._i18n;
      required(path.name, { message: () => t.translate('guestList.form.nameRequired') });
      pattern(path.name, /\S/, { message: () => t.translate('guestList.form.nameBlank') });
      maxLength(path.name, GUEST_NAME_MAX_LENGTH, {
        message: () => t.translate('guestList.form.tooLong', { max: GUEST_NAME_MAX_LENGTH }),
      });
      // Bounds of the stepper.
      min(path.maxCompanions, 0);
      max(path.maxCompanions, GUEST_COMPANIONS_MAX);
      maxLength(path.note, GUEST_NOTE_MAX_LENGTH, {
        message: () => t.translate('guestList.form.tooLong', { max: GUEST_NOTE_MAX_LENGTH }),
      });
    },
    { submission: { action: () => this._save() } },
  );

  private async _save(): Promise<void> {
    const guest = await this._data.save(this._model());
    if (guest) {
      this._dialogRef.close(guest);
    }
  }
}
