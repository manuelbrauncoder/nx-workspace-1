import { booleanAttribute, Component, input, numberAttribute } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { Localized } from '@core/i18n/localized';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { FormText } from '@shared/form-controls/form-text/form-text';
import { FormTextarea } from '@shared/form-controls/form-textarea/form-textarea';

/**
 * One text in both languages: a group named after the text with a field per language, side by
 * side on a wide screen.
 */
@Component({
  selector: 'app-localized-field',
  imports: [FormField, TranslatePipe, FormText, FormTextarea],
  styleUrl: './localized-field.scss',
  templateUrl: './localized-field.html',
})
export class LocalizedField {
  readonly field = input.required<FieldTree<Localized<string>>>();
  readonly label = input.required<string>();
  readonly description = input<string>();
  /** A textarea instead of a single line, e.g. for a description or a list. */
  readonly multiline = input(false, { transform: booleanAttribute });
  readonly rows = input(3, { transform: numberAttribute });
}
