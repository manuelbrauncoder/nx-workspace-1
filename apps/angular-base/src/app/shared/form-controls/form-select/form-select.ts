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
} from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { I18nService } from '@core/i18n/i18n.service';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { FormControlErrors, visibleErrorMessages } from '../form-control-shell/form-control-errors';
import { FormControlShell } from '../form-control-shell/form-control-shell';

export interface FormSelectOption<T> {
  value: T;
  label: string;
  disabled?: boolean;
}

/**
 * Single selection from a list for Signal Forms:
 * `<app-form-select [formField]="form.priority" label="Priorität" [options]="priorities" />`.
 */
@Component({
  selector: 'app-form-select',
  imports: [FormControlShell, HlmSelectImports],
  styleUrl: './form-select.scss',
  templateUrl: './form-select.html',
})
export class FormSelect<T> implements FormValueControl<T | null> {
  readonly value = model<T | null>(null);

  readonly label = input.required<string>();
  readonly description = input<string>();
  /** Defaults to a generic prompt. */
  readonly placeholder = input<string>();
  readonly options = input.required<readonly FormSelectOption<T>[]>();

  // Bound by the `FormField` directive.
  readonly errors = input<FormControlErrors>([]);
  readonly touched = input(false);
  readonly disabled = input(false);
  readonly required = input(false);
  readonly touch = output<void>();

  private readonly _id = inject(_IdGenerator).getId('form-select-');
  private readonly _errorMessages = computed(() =>
    visibleErrorMessages(this.errors(), this.touched()),
  );
  private readonly _open = signal(false);

  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly _i18n = inject(I18nService);

  private readonly _resolvedPlaceholder = computed(
    () => this.placeholder() ?? this._i18n.translate('form.selectPlaceholder'),
  );

  private readonly _optionLabel = (value: T): string =>
    this.options().find((option) => option.value === value)?.label ?? '';

  focus(options?: FocusOptions): void {
    this._host.nativeElement.querySelector<HTMLElement>('button')?.focus(options);
  }

  /** Focus stays on the trigger while the list is open, so only leaving the closed select counts. */
  private _leave(): void {
    if (!this._open()) {
      this.touch.emit();
    }
  }
}
