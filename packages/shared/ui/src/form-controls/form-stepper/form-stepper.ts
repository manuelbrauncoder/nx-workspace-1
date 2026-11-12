import { _IdGenerator } from '@angular/cdk/a11y';
import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  model,
  output,
} from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { UiButton } from '../../ui/button/button';
import { UiIcon } from '../../ui/icon/icon';
import { FormControlErrors, visibleErrorMessages } from '../form-control-shell/form-control-errors';
import { FormControlShell } from '../form-control-shell/form-control-shell';

/**
 * A small whole number with "−" and "+", for Signal Forms, e.g. how many people someone brings.
 * The buttons stop at the bounds of the `min()` and `max()` rules of the field (without them at
 * 0 and without an upper bound), a change is announced. For free input use `app-form-text`.
 *
 * @example
 * <!-- schema: max(path.companions, 3) -->
 * <app-form-stepper
 *   [formField]="form.companions"
 *   label="Ich bringe mit"
 *   decreaseLabel="Eine Person weniger"
 *   increaseLabel="Eine Person mehr"
 * />
 */
@Component({
  selector: 'app-form-stepper',
  imports: [FormControlShell, UiButton, UiIcon],
  styleUrl: './form-stepper.scss',
  templateUrl: './form-stepper.html',
})
export class FormStepper implements FormValueControl<number> {
  readonly value = model(0);

  readonly label = input.required<string>();
  readonly description = input<string>();
  /** Accessible name of the "−" button. */
  readonly decreaseLabel = input.required<string>();
  /** Accessible name of the "+" button. */
  readonly increaseLabel = input.required<string>();

  // Bound by the `FormField` directive, `min` and `max` from the rules of the field.
  readonly min = input<number | undefined>(undefined);
  readonly max = input<number | undefined>(undefined);
  readonly errors = input<FormControlErrors>([]);
  readonly touched = input(false);
  readonly disabled = input(false);
  readonly touch = output<void>();

  private readonly _id = inject(_IdGenerator).getId('form-stepper-');
  private readonly _errorMessages = computed(() =>
    visibleErrorMessages(this.errors(), this.touched()),
  );
  private readonly _lowest = computed(() => this.min() ?? 0);
  private readonly _highest = computed(() => this.max() ?? Infinity);
  private readonly _atMin = computed(() => this.value() <= this._lowest());
  private readonly _atMax = computed(() => this.value() >= this._highest());

  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly _injector = inject(Injector);

  focus(options?: FocusOptions): void {
    this._buttons()
      .find((button) => !button.disabled)
      ?.focus(options);
  }

  private _step(by: 1 | -1): void {
    const next = Math.min(this._highest(), Math.max(this._lowest(), this.value() + by));
    if (next === this.value()) {
      return;
    }
    this.value.set(next);
    // A button that reaches its limit is disabled and would drop the focus to the body.
    afterNextRender(
      () => {
        const [decrease, increase] = this._buttons();
        const focused = by === 1 ? increase : decrease;
        if (focused?.disabled) {
          (by === 1 ? decrease : increase)?.focus();
        }
      },
      { injector: this._injector },
    );
  }

  /** Leaving the control counts, moving between its buttons does not. */
  private _leave(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !this._host.nativeElement.contains(next)) {
      this.touch.emit();
    }
  }

  private _buttons(): HTMLButtonElement[] {
    return [...this._host.nativeElement.querySelectorAll<HTMLButtonElement>('button')];
  }
}
