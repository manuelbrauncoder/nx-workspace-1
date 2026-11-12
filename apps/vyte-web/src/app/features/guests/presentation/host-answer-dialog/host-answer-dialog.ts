import { Component, computed, inject, signal } from '@angular/core';
import { form, FormField, FormRoot, max, min, required } from '@angular/forms/signals';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import {
  FormRadioGroup,
  FormRadioOption,
} from '@shared/form-controls/form-radio-group/form-radio-group';
import { FormStepper } from '@shared/form-controls/form-stepper/form-stepper';
import { UiButton } from '@shared/ui/button/button';
import { UiDialog, UiDialogFooter } from '@shared/ui/dialog/dialog';
import { injectUiDialogData, injectUiDialogRef } from '@shared/ui/dialog/dialog-ref';
import { Guest, HostAnswer } from '../../domain/guest';
import { GuestDialogData } from '../guest-dialog-data';

export interface HostAnswerDialogData extends GuestDialogData<HostAnswer, Guest> {
  guest: Guest;
}

type Response = HostAnswer['response'];

/**
 * Records the answer a guest gave in person: comes or not, and with how many. The guest can
 * still change it through their link. Closes with the updated guest.
 */
@Component({
  selector: 'app-host-answer-dialog',
  imports: [
    FormField,
    FormRoot,
    TranslatePipe,
    FailureAlert,
    FormRadioGroup,
    FormStepper,
    UiButton,
    UiDialog,
    UiDialogFooter,
  ],
  styleUrl: './host-answer-dialog.scss',
  templateUrl: './host-answer-dialog.html',
})
export class HostAnswerDialog {
  private readonly _dialogRef = injectUiDialogRef<Guest>();
  private readonly _data = injectUiDialogData<HostAnswerDialogData>();
  private readonly _i18n = inject(I18nService);

  private readonly _guest = this._data.guest;
  private readonly _saving = computed(() => this._data.state().loadingState === 'loading');
  private readonly _failure = computed(() => this._data.state().failure);

  /** Computed, so the labels follow the language. */
  private readonly _responses = computed<FormRadioOption<Response>[]>(() => [
    { value: 'accepted', label: this._i18n.translate('guestList.answer.accepted') },
    { value: 'declined', label: this._i18n.translate('guestList.answer.declined') },
  ]);

  private readonly _model = signal<{ response: Response | null; companions: number }>({
    response: this._guest.response === 'pending' ? null : this._guest.response,
    companions: this._guest.companions,
  });
  private readonly _bringsCompanions = computed(
    () => this._model().response === 'accepted' && this._guest.maxCompanions > 0,
  );

  private readonly _answerForm = form(
    this._model,
    (path) => {
      // Bounds of the stepper.
      min(path.companions, 0);
      max(path.companions, this._guest.maxCompanions);
      required(path.response, {
        message: () => this._i18n.translate('guestList.answer.responseRequired'),
      });
    },
    { submission: { action: () => this._save() } },
  );

  private async _save(): Promise<void> {
    const { response, companions } = this._model();
    if (!response) {
      return;
    }
    const guest = await this._data.save({ response, companions });
    if (guest) {
      this._dialogRef.close(guest);
    }
  }
}
