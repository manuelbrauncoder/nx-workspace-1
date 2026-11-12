import { _IdGenerator } from '@angular/cdk/a11y';
import { Component, computed, ElementRef, inject, input, model, output } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import { FormControlErrors, visibleErrorMessages } from '../form-control-shell/form-control-errors';
import { FormControlShell } from '../form-control-shell/form-control-shell';

export interface FormRadioOption<T> {
  value: T;
  label: string;
  /** A second line under the label. */
  description?: string;
}

/** `list` stacks the options, `cards` sets them as large tiles side by side. */
export type FormRadioGroupLayout = 'list' | 'cards';

/**
 * One of a few options as a radio group, for Signal Forms. The whole option including its label
 * can be clicked. For a row of buttons use `app-form-toggle-group`, for longer lists
 * `app-form-select`. An app styles the tiles of `layout="cards"` through
 * `--form-choice-border`, `--form-choice-radius` and `--form-choice-shadow`.
 *
 * @example
 * <app-form-radio-group
 *   [formField]="form.response"
 *   [options]="responses"
 *   label="Antwort"
 *   layout="cards"
 * />
 */
@Component({
  selector: 'app-form-radio-group',
  imports: [FormControlShell, HlmRadioGroupImports],
  styleUrl: './form-radio-group.scss',
  templateUrl: './form-radio-group.html',
  host: {
    '[attr.data-layout]': 'layout()',
  },
})
export class FormRadioGroup<T> implements FormValueControl<T | null> {
  readonly value = model<T | null>(null);

  readonly label = input.required<string>();
  readonly description = input<string>();
  readonly options = input.required<readonly FormRadioOption<T>[]>();
  readonly layout = input<FormRadioGroupLayout>('list');

  // Bound by the `FormField` directive.
  readonly errors = input<FormControlErrors>([]);
  readonly touched = input(false);
  readonly disabled = input(false);
  readonly required = input(false);
  readonly touch = output<void>();

  private readonly _id = inject(_IdGenerator).getId('form-radio-group-');
  private readonly _errorMessages = computed(() =>
    visibleErrorMessages(this.errors(), this.touched()),
  );

  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Focuses the selected option, or the first one when nothing is selected yet. */
  focus(options?: FocusOptions): void {
    const radios = [...this._host.nativeElement.querySelectorAll<HTMLInputElement>('input')];
    (radios.find((radio) => radio.checked) ?? radios[0])?.focus(options);
  }

  /** Leaving the group counts, moving between its options does not. */
  private _leave(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !this._host.nativeElement.contains(next)) {
      this.touch.emit();
    }
  }

  private _select(value: unknown): void {
    this.value.set(value as T);
  }

  private _optionId(index: number): string {
    return `${this._id}-${index}`;
  }
}
