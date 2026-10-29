import { _IdGenerator } from '@angular/cdk/a11y';
import { Component, computed, ElementRef, inject, input, model, output } from '@angular/core';
import { FormCheckboxControl } from '@angular/forms/signals';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';
import { FormControlErrors, visibleErrorMessages } from '../form-control-shell/form-control-errors';
import { FormControlShell } from '../form-control-shell/form-control-shell';

/** Switch for Signal Forms: `<app-form-switch [formField]="form.notify" label="Benachrichtigen" />`. */
@Component({
  selector: 'app-form-switch',
  imports: [FormControlShell, HlmSwitchImports],
  styleUrl: './form-switch.scss',
  templateUrl: './form-switch.html',
})
export class FormSwitch implements FormCheckboxControl {
  readonly checked = model(false);

  readonly label = input.required<string>();
  readonly description = input<string>();

  // Bound by the `FormField` directive.
  readonly errors = input<FormControlErrors>([]);
  readonly touched = input(false);
  readonly disabled = input(false);
  readonly touch = output<void>();

  private readonly _id = inject(_IdGenerator).getId('form-switch-');
  private readonly _errorMessages = computed(() =>
    visibleErrorMessages(this.errors(), this.touched()),
  );

  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);

  focus(options?: FocusOptions): void {
    this._host.nativeElement.querySelector<HTMLElement>('[role="switch"]')?.focus(options);
  }
}
