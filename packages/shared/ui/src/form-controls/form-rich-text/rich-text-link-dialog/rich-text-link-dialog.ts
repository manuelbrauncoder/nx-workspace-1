import { Component, inject, signal } from '@angular/core';
import { form, FormField, validate } from '@angular/forms/signals';
import { isAllowedRichTextHref, RichTextProfile } from '@contracts/rich-text';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '../../../ui/button/button';
import { UiDialog, UiDialogFooter } from '../../../ui/dialog/dialog';
import { injectUiDialogData, injectUiDialogRef } from '../../../ui/dialog/dialog-ref';
import { FormText } from '../../form-text/form-text';

/** A typed address without a scheme, such as `example.org`, is taken as a web address. */
function toHref(input: string): string {
  const address = input.trim();
  return /^[a-z][a-z0-9+.-]*:/i.test(address) || address.startsWith('/')
    ? address
    : `https://${address}`;
}

/** The address of the link at the cursor (`''` for a new one) and which links are allowed. */
export interface RichTextLinkDialogData {
  href: string;
  profile: RichTextProfile;
}

/**
 * @internal Asks for the address of a link. Opened with the current address as data and closed
 * with the new one, with `null` to remove the link, or without a result when cancelled.
 */
@Component({
  selector: 'app-rich-text-link-dialog',
  imports: [FormField, TranslatePipe, FormText, UiButton, UiDialog, UiDialogFooter],
  styleUrl: './rich-text-link-dialog.scss',
  templateUrl: './rich-text-link-dialog.html',
})
export class RichTextLinkDialog {
  private readonly _dialogRef = injectUiDialogRef<string | null>();
  private readonly _i18n = inject(I18nService);

  private readonly _data = injectUiDialogData<RichTextLinkDialogData>();
  /** Empty when the dialog adds a link, so there is nothing to remove. */
  private readonly _current = this._data.href;
  private readonly _descriptionKey =
    this._data.profile === 'page'
      ? 'form.richText.linkUrlDescriptionPage'
      : 'form.richText.linkUrlDescription';
  private readonly _model = signal({ address: this._current });
  private readonly _linkForm = form(this._model, (path) => {
    validate(path.address, ({ value }) =>
      isAllowedRichTextHref(toHref(value()), this._data.profile)
        ? undefined
        : { kind: 'address', message: this._i18n.translate('form.richText.linkInvalid') },
    );
  });

  private _apply(event: Event): void {
    event.preventDefault();
    this._linkForm.address().markAsTouched();
    if (this._linkForm().valid()) {
      this._dialogRef.close(toHref(this._model().address));
    }
  }
}
