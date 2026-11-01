import { _IdGenerator } from '@angular/cdk/a11y';
import { Component, computed, ElementRef, inject, input, model, output } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { UiToggleGroup, type UiToggleGroupOption } from '../../ui/toggle-group/toggle-group';
import { FormControlErrors, visibleErrorMessages } from '../form-control-shell/form-control-errors';
import { FormControlShell } from '../form-control-shell/form-control-shell';

/**
 * One of a few options as a row of buttons, for Signal Forms. For longer lists use
 * `app-form-select`.
 *
 * @example
 * <app-form-toggle-group [formField]="form.finish" label="Spielende" [options]="finishes" />
 */
@Component({
  selector: 'app-form-toggle-group',
  imports: [FormControlShell, UiToggleGroup],
  styleUrl: './form-toggle-group.scss',
  templateUrl: './form-toggle-group.html',
})
export class FormToggleGroup<T> implements FormValueControl<T | null> {
  readonly value = model<T | null>(null);

  readonly label = input.required<string>();
  readonly description = input<string>();
  readonly options = input.required<readonly UiToggleGroupOption<T>[]>();

  // Bound by the `FormField` directive.
  readonly errors = input<FormControlErrors>([]);
  readonly touched = input(false);
  readonly disabled = input(false);
  readonly required = input(false);
  readonly touch = output<void>();

  private readonly _id = inject(_IdGenerator).getId('form-toggle-group-');
  private readonly _errorMessages = computed(() =>
    visibleErrorMessages(this.errors(), this.touched()),
  );

  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);

  focus(options?: FocusOptions): void {
    this._host.nativeElement
      .querySelector<HTMLElement>('button[aria-pressed="true"]')
      ?.focus(options);
  }

  /** Leaving the group counts, moving between its buttons does not. */
  private _leave(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !this._host.nativeElement.contains(next)) {
      this.touch.emit();
    }
  }
}
