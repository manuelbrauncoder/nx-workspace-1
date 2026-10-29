import { _IdGenerator } from '@angular/cdk/a11y';
import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  untracked,
} from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { I18nService } from '@core/i18n/i18n.service';
import { formatLocalDate } from '@core/i18n/local-date';
import { injectBrnCalendarI18n } from '@spartan-ng/brain/calendar';
import { HlmDatePicker, HlmDatePickerImports } from '@spartan-ng/helm/date-picker';
import { FormControlErrors, visibleErrorMessages } from '../form-control-shell/form-control-errors';
import { FormControlShell } from '../form-control-shell/form-control-shell';
import { calendarI18n } from './calendar-i18n';

/** Date picker for Signal Forms: `<app-form-date [formField]="form.dueDate" label="Fällig am" />`. */
@Component({
  selector: 'app-form-date',
  imports: [FormControlShell, HlmDatePickerImports],
  styleUrl: './form-date.scss',
  templateUrl: './form-date.html',
})
export class FormDate implements FormValueControl<Date | null> {
  readonly value = model<Date | null>(null);

  readonly label = input.required<string>();
  readonly description = input<string>();
  /** Defaults to a generic prompt. */
  readonly placeholder = input<string>();

  // Bound by the `FormField` directive.
  readonly errors = input<FormControlErrors>([]);
  readonly touched = input(false);
  readonly disabled = input(false);
  readonly required = input(false);
  readonly min = input<Date | undefined>();
  readonly max = input<Date | undefined>();
  readonly touch = output<void>();

  private readonly _id = inject(_IdGenerator).getId('form-date-');
  private readonly _errorMessages = computed(() =>
    visibleErrorMessages(this.errors(), this.touched()),
  );

  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly _i18n = inject(I18nService);

  private readonly _resolvedPlaceholder = computed(
    () => this.placeholder() ?? this._i18n.translate('form.datePlaceholder'),
  );
  /** A new function per locale, so the picker formats its value again when the language changes. */
  private readonly _formatDate = computed(() => {
    const locale = this._i18n.locale();
    return (date: Date): string => formatLocalDate(date, locale, 'date');
  });

  constructor() {
    // The calendar keeps its labels in a service of its own, which follows the language from here.
    const calendar = injectBrnCalendarI18n();
    effect(() => {
      const labels = calendarI18n(this._i18n.locale(), {
        previousMonth: this._i18n.translate('form.previousMonth'),
        nextMonth: this._i18n.translate('form.nextMonth'),
      });
      // `use()` reads the current labels to merge them, which must not retrigger this effect.
      untracked(() => calendar.use(labels));
    });
  }

  focus(options?: FocusOptions): void {
    this._host.nativeElement.querySelector<HTMLElement>('button')?.focus(options);
  }

  /** Opening the calendar moves focus out of the trigger, which is not leaving the control yet. */
  private _leave(picker: HlmDatePicker<Date>): void {
    if (picker.popover().stateComputed() !== 'open') {
      this.touch.emit();
    }
  }
}
