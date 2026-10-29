import { Component, computed, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { UI_ICONS, UiIconName } from './ui-icons';

/**
 * Icon from the central registry in `ui-icons.ts`. Sized by the font size of its context.
 * Decorative by default, so it is hidden from assistive technology. Pass `label` when the icon
 * carries meaning on its own.
 *
 * @example
 * <app-ui-icon name="plus" />
 * <app-ui-icon name="trash" label="Löschen" />
 */
@Component({
  selector: 'app-ui-icon',
  imports: [NgIcon],
  styleUrl: './icon.scss',
  templateUrl: './icon.html',
  host: {
    '[attr.role]': "label() ? 'img' : null",
    '[attr.aria-label]': 'label() ?? null',
    '[attr.aria-hidden]': "label() ? null : 'true'",
  },
})
export class UiIcon {
  readonly name = input.required<UiIconName>();
  /** Accessible name. Without it the icon is treated as decorative. */
  readonly label = input<string>();

  private readonly _svg = computed(() => UI_ICONS[this.name()]);
}
