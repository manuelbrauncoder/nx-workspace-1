import { Component, computed, inject, signal } from '@angular/core';
import { form, FormField, FormRoot, max, min, validate } from '@angular/forms/signals';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { FormStepper } from '@shared/form-controls/form-stepper/form-stepper';
import { FormTextarea } from '@shared/form-controls/form-textarea/form-textarea';
import { UiButton } from '@shared/ui/button/button';
import { UiDialog, UiDialogFooter } from '@shared/ui/dialog/dialog';
import { injectUiDialogData, injectUiDialogRef } from '@shared/ui/dialog/dialog-ref';
import {
  Guest,
  GUEST_COMPANIONS_MAX,
  GUEST_NAME_MAX_LENGTH,
  GUESTS_BULK_MAX,
  GuestsBulk,
} from '../../domain/guest';
import { parseNames } from '../../domain/guest-list';
import { GuestDialogData } from '../guest-dialog-data';

export type GuestsBulkDialogData = GuestDialogData<GuestsBulk, Guest[]>;

/**
 * A pasted list of names, one per line, with one allowance for all. Closes with the new guests.
 * The backend adds all of them or none.
 */
@Component({
  selector: 'app-guests-bulk-dialog',
  imports: [
    FormField,
    FormRoot,
    TranslatePipe,
    FailureAlert,
    FormStepper,
    FormTextarea,
    UiButton,
    UiDialog,
    UiDialogFooter,
  ],
  styleUrl: './guests-bulk-dialog.scss',
  templateUrl: './guests-bulk-dialog.html',
})
export class GuestsBulkDialog {
  private readonly _dialogRef = injectUiDialogRef<Guest[]>();
  private readonly _data = injectUiDialogData<GuestsBulkDialogData>();
  private readonly _i18n = inject(I18nService);

  private readonly _maxNames = GUESTS_BULK_MAX;
  private readonly _saving = computed(() => this._data.state().loadingState === 'loading');
  private readonly _failure = computed(() => this._data.state().failure);

  private readonly _model = signal({ names: '', maxCompanions: 0 });
  private readonly _names = computed(() => parseNames(this._model().names));

  private readonly _bulkForm = form(
    this._model,
    (path) => {
      const t = this._i18n;
      // Bounds of the stepper.
      min(path.maxCompanions, 0);
      max(path.maxCompanions, GUEST_COMPANIONS_MAX);
      validate(path.names, ({ value }) => {
        const names = parseNames(value());
        if (names.length === 0) {
          return { kind: 'required', message: t.translate('guestList.bulk.namesRequired') };
        }
        if (names.length > GUESTS_BULK_MAX) {
          return {
            kind: 'maxNames',
            message: t.translate('guestList.bulk.tooMany', { max: GUESTS_BULK_MAX }),
          };
        }
        const long = names.find((name) => name.length > GUEST_NAME_MAX_LENGTH);
        return long
          ? {
              kind: 'nameTooLong',
              message: t.translate('guestList.bulk.nameTooLong', {
                name: `${long.slice(0, 20)}…`,
                max: GUEST_NAME_MAX_LENGTH,
              }),
            }
          : undefined;
      });
    },
    { submission: { action: () => this._save() } },
  );

  private async _save(): Promise<void> {
    const guests = await this._data.save({
      names: this._names(),
      maxCompanions: this._model().maxCompanions,
    });
    if (guests) {
      this._dialogRef.close(guests);
    }
  }
}
