import { Component } from '@angular/core';
import {
  HlmDropdownMenuRadio,
  HlmDropdownMenuRadioIndicator,
} from '@spartan-ng/helm/dropdown-menu';

/**
 * Single-choice item inside an `app-ui-menu-group`, with a check mark on the chosen one.
 * `[checked]` marks the current choice, `(triggered)` emits when the user picks the item.
 *
 * @example
 * <app-ui-menu-group>
 *   @for (option of options; track option.mode) {
 *     <button
 *       [checked]="_mode() === option.mode"
 *       (triggered)="_mode.set(option.mode)"
 *       appUiMenuRadio
 *       type="button"
 *     >
 *       {{ option.label }}
 *     </button>
 *   }
 * </app-ui-menu-group>
 */
@Component({
  selector: 'button[appUiMenuRadio]',
  imports: [HlmDropdownMenuRadioIndicator],
  styleUrl: './menu-radio.scss',
  templateUrl: './menu-radio.html',
  hostDirectives: [HlmDropdownMenuRadio],
})
export class UiMenuRadio {}
