import { _IdGenerator } from '@angular/cdk/a11y';
import { Component, computed, ElementRef, inject, input, model, output } from '@angular/core';
import { FormCheckboxControl } from '@angular/forms/signals';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { FormControlErrors, visibleErrorMessages } from '../form-control-shell/form-control-errors';
import { FormControlShell } from '../form-control-shell/form-control-shell';

/** Checkbox for Signal Forms: `<app-form-checkbox [formField]="form.done" label="Erledigt" />`. */
@Component({
  selector: 'app-form-checkbox',
  imports: [FormControlShell, HlmCheckboxImports],
  styleUrl: './form-checkbox.scss',
  templateUrl: './form-checkbox.html',
})
export class FormCheckbox implements FormCheckboxControl {
  readonly checked = model(false);

  readonly label = input.required<string>();
  readonly description = input<string>();

  // Bound by the `FormField` directive.
  readonly errors = input<FormControlErrors>([]);
  readonly touched = input(false);
  readonly disabled = input(false);
  readonly required = input(false);
  readonly name = input('');
  readonly touch = output<void>();

  private readonly _id = inject(_IdGenerator).getId('form-checkbox-');
  private readonly _errorMessages = computed(() =>
    visibleErrorMessages(this.errors(), this.touched()),
  );

  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);

  focus(options?: FocusOptions): void {
    this._host.nativeElement.querySelector<HTMLElement>('[role="checkbox"]')?.focus(options);
  }
}
