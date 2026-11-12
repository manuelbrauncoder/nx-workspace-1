import { Component, inject, input, output } from '@angular/core';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiIcon } from '@shared/ui/icon/icon';

/** Delete button that asks for confirmation before it emits. */
@Component({
  selector: 'app-event-delete-button',
  imports: [TranslatePipe, UiButton, UiIcon],
  styleUrl: './event-delete-button.scss',
  templateUrl: './event-delete-button.html',
})
export class EventDeleteButton {
  /** Title of the event, named in the button label and the confirmation. */
  readonly title = input.required<string>();

  /** Emits after the user confirmed the deletion. */
  readonly confirmed = output<void>();

  private readonly _confirmDialog = inject(UiConfirmDialogService);
  private readonly _i18n = inject(I18nService);

  private async _askForConfirmation(): Promise<void> {
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('events.delete.heading'),
      description: this._i18n.translate('events.delete.description', { title: this.title() }),
      confirmLabel: this._i18n.translate('events.delete.confirm'),
      variant: 'destructive',
    });
    if (confirmed) {
      this.confirmed.emit();
    }
  }
}
