import { Component, inject, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { FormText } from '@shared/form-controls/form-text/form-text';
import { UiButton } from '@shared/ui/button/button';
import { UiDialog, UiDialogFooter } from '@shared/ui/dialog/dialog';
import { injectUiDialogData, injectUiDialogRef } from '@shared/ui/dialog/dialog-ref';

/** Asks for a name, prefilled from the dialog data, and returns it as the dialog result. */
@Component({
  selector: 'app-showcase-example-dialog',
  imports: [FormField, TranslatePipe, FormText, UiButton, UiDialog, UiDialogFooter],
  styleUrl: './example-dialog.scss',
  templateUrl: './example-dialog.html',
})
export class ExampleDialog {
  private readonly _dialogRef = injectUiDialogRef<string>();
  private readonly _i18n = inject(I18nService);

  private readonly _model = signal({ name: injectUiDialogData<string>() });
  private readonly _nameForm = form(this._model, (path) => {
    required(path.name, {
      message: () => this._i18n.translate('showcaseComponents.dialog.nameRequired'),
    });
  });

  private _save(event: Event): void {
    event.preventDefault();
    this._nameForm.name().markAsTouched();
    if (this._nameForm().valid()) {
      this._dialogRef.close(this._model().name);
    }
  }
}
