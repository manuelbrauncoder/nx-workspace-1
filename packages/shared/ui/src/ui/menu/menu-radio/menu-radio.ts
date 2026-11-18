import { Component } from '@angular/core';
import {
  HlmDropdownMenuRadio,
  HlmDropdownMenuRadioIndicator,
} from '@spartan-ng/helm/dropdown-menu';
import { classes } from '@spartan-ng/helm/utils';

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
/**
 * Shared by every item of a menu. 44px high, the touch target of a product page (Helm makes them
 * 32px). Helm marks the focus only by a pale background (about 1.25:1), too faint to see, so a
 * solid ring inside the item shows where the keyboard is.
 */
export const UI_MENU_ITEM_CLASSES =
  'min-h-11 py-2.5 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring focus-visible:-outline-offset-2';

@Component({
  selector: 'button[appUiMenuRadio]',
  imports: [HlmDropdownMenuRadioIndicator],
  styleUrl: './menu-radio.scss',
  templateUrl: './menu-radio.html',
  hostDirectives: [HlmDropdownMenuRadio],
})
export class UiMenuRadio {
  constructor() {
    classes(() => UI_MENU_ITEM_CLASSES);
  }
}
