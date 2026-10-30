import { Component, inject, input, output } from '@angular/core';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';

/** Delete button that asks for confirmation before it emits. */
@Component({
  selector: 'app-note-delete-button',
  imports: [TranslatePipe, UiButton],
  styleUrl: './note-delete-button.scss',
  templateUrl: './note-delete-button.html',
})
export class NoteDeleteButton {
  /** Title of the note, named in the button label and the confirmation. */
  readonly title = input.required<string>();

  /** Emits after the user confirmed the deletion. */
  readonly confirmed = output<void>();

  private readonly _confirmDialog = inject(UiConfirmDialogService);
  private readonly _i18n = inject(I18nService);

  private async _askForConfirmation(): Promise<void> {
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('notes.delete.heading'),
      description: this._i18n.translate('notes.delete.description', { title: this.title() }),
      confirmLabel: this._i18n.translate('notes.delete.confirm'),
      variant: 'destructive',
    });
    if (confirmed) {
      this.confirmed.emit();
    }
  }
}
