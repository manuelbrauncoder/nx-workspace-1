import { booleanAttribute, Component, input, model } from '@angular/core';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';

export interface UiToggleGroupOption<T> {
  value: T;
  label: string;
  disabled?: boolean;
}

/** `brand` fills the selected option with the brand color of the app. */
export type UiToggleGroupVariant = 'default' | 'outline' | 'brand';
export type UiToggleGroupSize = 'default' | 'sm' | 'lg';

/**
 * A row of buttons of which exactly one is selected, e.g. a mode switch. Outside a form;
 * in a Signal Form use `app-form-toggle-group`. `fullWidth` lets the options share the width.
 * An app sets the option height through `--ui-toggle-group-item-height`.
 *
 * @example
 * <app-ui-toggle-group
 *   [(value)]="_multiplier"
 *   [options]="_multipliers"
 *   ariaLabel="Multiplikator"
 *   variant="brand"
 *   fullWidth
 * />
 */
@Component({
  selector: 'app-ui-toggle-group',
  imports: [HlmToggleGroupImports],
  styleUrl: './toggle-group.scss',
  templateUrl: './toggle-group.html',
  host: {
    '[class.ui-toggle-group--full-width]': 'fullWidth()',
    '[attr.data-variant]': 'variant()',
  },
})
export class UiToggleGroup<T> {
  readonly value = model<T | null>(null);
  readonly options = input.required<readonly UiToggleGroupOption<T>[]>();
  /** Accessible name of the group. */
  readonly ariaLabel = input<string>();
  /** Id of an element that names the group, instead of `ariaLabel`. */
  readonly ariaLabelledby = input<string>();
  /** Ids of hints and errors that describe the group. */
  readonly ariaDescribedby = input<string | null>();
  readonly variant = input<UiToggleGroupVariant>('default');
  readonly size = input<UiToggleGroupSize>('default');
  readonly fullWidth = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Clicking the selected option again keeps it selected, so the value never becomes `null`. */
  private _select(value: unknown): void {
    if (value !== null && value !== undefined) {
      this.value.set(value as T);
    }
  }
}
