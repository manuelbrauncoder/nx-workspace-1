import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  Component,
  computed,
  effect,
  inject,
  input,
  Signal,
  TemplateRef,
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { BrnFieldA11yService } from '@spartan-ng/brain/field';
import { HlmFieldImports } from '@spartan-ng/helm/field';

/** The part of an `NgControl` that Spartan reads, reduced to "are errors visible". */
function spartanControlState(invalid: Signal<boolean>) {
  return {
    control: {
      // A signal named `field` makes Spartan read the getters below reactively.
      field: invalid,
      get invalid() {
        return invalid();
      },
      get touched() {
        return invalid();
      },
      get dirty() {
        return false;
      },
      get errors() {
        return invalid() ? { invalid: true } : null;
      },
    },
  };
}

/**
 * Label, description and error messages around a form control. Internal to `shared/form-controls`,
 * features use the controls (`app-form-text`, `app-form-select`, ...) instead.
 */
@Component({
  selector: 'app-form-control-shell',
  imports: [NgTemplateOutlet, HlmFieldImports, TranslatePipe],
  providers: [
    // The projected control resolves this instance and takes its `aria-describedby` from it.
    BrnFieldA11yService,
    // Spartan derives `aria-invalid` and the invalid styling from the nearest `NgControl`. Without
    // this it would find the one of the `FormField` directive and flag untouched fields as invalid.
    { provide: NgControl, useFactory: () => inject(FormControlShell).spartanControl },
  ],
  styleUrl: './form-control-shell.scss',
  templateUrl: './form-control-shell.html',
})
export class FormControlShell {
  /** Id of the focusable element of the projected control. */
  readonly controlId = input.required<string>();
  readonly label = input.required<string>();
  /** Renders the label instead of `label`, for a label with markup such as a link in it. */
  readonly labelTemplate = input<TemplateRef<unknown>>();
  readonly description = input<string>();
  /**
   * Ids of descriptions outside the shell that also explain this control, e.g. the description of
   * the group it is part of. Read before its own description.
   */
  readonly descriptionIds = input<readonly string[]>([]);
  /** Messages to show, already reduced to the visible ones. */
  readonly errors = input<readonly string[]>([]);
  readonly required = input(false);
  /**
   * Puts "required" into the label as text. For controls that are a button, such as the date
   * picker: a button has no `required`, so assistive tech would not hear it otherwise.
   */
  readonly announceRequired = input(false, { transform: booleanAttribute });
  readonly disabled = input(false);
  /** `horizontal` puts the control in front of the label, as for a checkbox. */
  readonly orientation = input<'vertical' | 'horizontal'>('vertical');

  private readonly _a11y = inject(BrnFieldA11yService);

  private readonly _invalid = computed(() => this.errors().length > 0);
  /** For controls a `<label for>` cannot name, such as an editable `div`. */
  readonly labelId = computed(() => `${this.controlId()}-label`);
  private readonly _descriptionId = computed(() => `${this.controlId()}-description`);
  private readonly _errorId = computed(() => `${this.controlId()}-error`);

  /** For controls that take `aria-describedby` as an input instead of reading it from the field. */
  readonly describedBy = computed(() => {
    const ids = [
      ...this.descriptionIds(),
      ...(this.description() ? [this._descriptionId()] : []),
      ...(this._invalid() ? [this._errorId()] : []),
    ];
    return ids.length > 0 ? ids.join(' ') : null;
  });

  /** Resolved by Spartan in place of an `NgControl`. */
  readonly spartanControl = spartanControlState(this._invalid);

  constructor() {
    // One list registered as a whole: Spartan appends each id, so registering the outside ids on
    // their own would put them behind the own description once they change.
    effect((onCleanup) => {
      const ids = [
        ...this.descriptionIds(),
        ...(this.description() ? [this._descriptionId()] : []),
      ];
      for (const id of ids) {
        this._a11y.registerDescription(id);
      }
      onCleanup(() => ids.forEach((id) => this._a11y.unregisterDescription(id)));
    });
    effect((onCleanup) => {
      if (!this._invalid()) {
        return;
      }
      const id = this._errorId();
      this._a11y.registerError(id);
      onCleanup(() => this._a11y.unregisterError(id));
    });
  }
}
