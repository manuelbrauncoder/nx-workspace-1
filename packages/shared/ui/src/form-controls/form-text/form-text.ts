import { _IdGenerator } from '@angular/cdk/a11y';
import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { AppLanguage } from '@core/i18n/languages';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { UiIcon } from '../../ui/icon/icon';
import { FormControlErrors, visibleErrorMessages } from '../form-control-shell/form-control-errors';
import { FormControlShell } from '../form-control-shell/form-control-shell';

/** `time` is the native time input, its value is `'HH:MM'` (or `''`). */
export type FormTextType = 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'time';

/**
 * Single-line text field for Signal Forms: `<app-form-text [formField]="form.title" label="Titel" />`.
 * A `password` field has a toggle at its end that shows the password as plain text and hides it again.
 */
@Component({
  selector: 'app-form-text',
  imports: [FormControlShell, HlmInputImports, TranslatePipe, UiIcon],
  styleUrl: './form-text.scss',
  templateUrl: './form-text.html',
})
export class FormText implements FormValueControl<string> {
  readonly value = model('');

  readonly label = input.required<string>();
  readonly description = input<string>();
  /**
   * Ids of descriptions outside the control that also explain it, e.g. the description of the
   * group the field is part of. Screen readers often skip a group's description on focus.
   */
  readonly descriptionIds = input<readonly string[]>([]);
  readonly type = input<FormTextType>('text');
  readonly placeholder = input<string>();
  readonly autocomplete = input<string>();
  /**
   * Language of the text typed in, when it differs from the page, e.g. the English version of a
   * text. Sets `lang` on the input only, the label stays in the page language. A `placeholder` is
   * read in `contentLang` as well, so write it in that language or leave it out.
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

  private readonly _isPassword = computed(() => this.type() === 'password');
  /** Whether a password field shows its text, switched by the toggle. */
  private readonly _passwordVisible = signal(false);
  private readonly _inputType = computed(() =>
    this._isPassword() && this._passwordVisible() ? 'text' : this.type(),
  );

  private _togglePassword(): void {
    this._passwordVisible.update((visible) => !visible);
  }

  focus(options?: FocusOptions): void {
    this._control().nativeElement.focus(options);
  }
}
