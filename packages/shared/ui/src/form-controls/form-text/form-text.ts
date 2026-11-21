import { _IdGenerator } from '@angular/cdk/a11y';
import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { AppLanguage } from '@core/i18n/languages';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { FormControlErrors, visibleErrorMessages } from '../form-control-shell/form-control-errors';
import { FormControlShell } from '../form-control-shell/form-control-shell';

/** `time` is the native time input, its value is `'HH:MM'` (or `''`). */
export type FormTextType = 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'time';

/** Single-line text field for Signal Forms: `<app-form-text [formField]="form.title" label="Titel" />`. */
@Component({
  selector: 'app-form-text',
  imports: [FormControlShell, HlmInputImports],
  styleUrl: './form-text.scss',
  templateUrl: './form-text.html',
})
export class FormText implements FormValueControl<string> {
  readonly value = model('');

  readonly label = input.required<string>();
  readonly description = input<string>();
  readonly type = input<FormTextType>('text');
  readonly placeholder = input<string>();
  readonly autocomplete = input<string>();
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

  private readonly _id = inject(_IdGenerator).getId('form-text-');
  private readonly _errorMessages = computed(() =>
    visibleErrorMessages(this.errors(), this.touched()),
  );

  private readonly _control = viewChild.required<ElementRef<HTMLInputElement>>('control');

  focus(options?: FocusOptions): void {
    this._control().nativeElement.focus(options);
  }
}
