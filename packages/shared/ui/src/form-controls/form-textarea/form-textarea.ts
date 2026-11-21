import { _IdGenerator } from '@angular/cdk/a11y';
import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  numberAttribute,
  output,
  viewChild,
} from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { AppLanguage } from '@core/i18n/languages';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { FormControlErrors, visibleErrorMessages } from '../form-control-shell/form-control-errors';
import { FormControlShell } from '../form-control-shell/form-control-shell';

/** Multi-line text field for Signal Forms: `<app-form-textarea [formField]="form.content" label="Inhalt" />`. */
@Component({
  selector: 'app-form-textarea',
  imports: [FormControlShell, HlmTextareaImports],
  styleUrl: './form-textarea.scss',
  templateUrl: './form-textarea.html',
})
export class FormTextarea implements FormValueControl<string> {
  readonly value = model('');

  readonly label = input.required<string>();
  readonly description = input<string>();
  readonly placeholder = input<string>();
  readonly rows = input(4, { transform: numberAttribute });
  /**
   * Language of the text typed in, when it differs from the page, e.g. the English version of a
   * text. Sets `lang` on the input only, the label stays in the page language.
   */
  readonly contentLang = input<AppLanguage>();

  // Bound by the `FormField` directive.
  readonly errors = input<FormControlErrors>([]);
  readonly touched = input(false);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly required = input(false);
  readonly name = input('');
  readonly touch = output<void>();

  private readonly _id = inject(_IdGenerator).getId('form-textarea-');
  private readonly _errorMessages = computed(() =>
    visibleErrorMessages(this.errors(), this.touched()),
  );

  private readonly _control = viewChild.required<ElementRef<HTMLTextAreaElement>>('control');

  focus(options?: FocusOptions): void {
    this._control().nativeElement.focus(options);
  }
}
