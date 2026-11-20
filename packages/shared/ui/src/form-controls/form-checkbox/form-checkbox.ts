import { _IdGenerator } from '@angular/cdk/a11y';
import {
  Component,
  computed,
  contentChild,
  ElementRef,
  inject,
  input,
  model,
  output,
  TemplateRef,
} from '@angular/core';
import { FormCheckboxControl } from '@angular/forms/signals';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { FormControlErrors, visibleErrorMessages } from '../form-control-shell/form-control-errors';
import { FormControlShell } from '../form-control-shell/form-control-shell';

/**
 * Checkbox for Signal Forms: `<app-form-checkbox [formField]="form.done" label="Erledigt" />`.
 * A label with markup, e.g. a link to the privacy policy inside the sentence, comes as an
 * `ng-template` instead of `label`. A click on the link opens it and leaves the box as it is.
 *
 * @example
 * <app-form-checkbox [formField]="form.privacy">
 *   <ng-template>Ich habe die <a routerLink="/privacy">Datenschutzerklärung</a> gelesen.</ng-template>
 * </app-form-checkbox>
 */
@Component({
  selector: 'app-form-checkbox',
  imports: [FormControlShell, HlmCheckboxImports],
  styleUrl: './form-checkbox.scss',
  templateUrl: './form-checkbox.html',
})
export class FormCheckbox implements FormCheckboxControl {
  readonly checked = model(false);

  /** The text of the label. Leave it out when the label comes as an `ng-template`. */
  readonly label = input('');
  readonly description = input<string>();

  // Bound by the `FormField` directive.
  readonly errors = input<FormControlErrors>([]);
  readonly touched = input(false);
  readonly disabled = input(false);
  readonly required = input(false);
  readonly name = input('');
  readonly touch = output<void>();

  private readonly _id = inject(_IdGenerator).getId('form-checkbox-');
  private readonly _labelTemplate = contentChild(TemplateRef);
  private readonly _errorMessages = computed(() =>
    visibleErrorMessages(this.errors(), this.touched()),
  );

  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);

  focus(options?: FocusOptions): void {
    this._host.nativeElement.querySelector<HTMLElement>('[role="checkbox"]')?.focus(options);
  }
}
