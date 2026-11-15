import { Component, computed, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { UI_ICONS, UiIconName } from './ui-icons';

/** Fixed sizes of an icon: `sm` 16px, `md` 20px, `lg` 24px. */
export type UiIconSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

const SIZES: Record<UiIconSize, string> = {
  sm: '1rem',
  md: '1.25rem',
  lg: '1.5rem',
  xl: '2rem',
  xxl: '3rem',
};

/**
 * Icon from the central registry in `ui-icons.ts`. Sized by the font size of its context, or by
 * `size` when it has to stand out from it. Decorative by default, so it is hidden from assistive
 * technology. Pass `label` when the icon carries meaning on its own.
 *
 * @example
 * <app-ui-icon name="plus" />
 * <app-ui-icon name="user" size="lg" />
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
  /** A fixed size. Without it the icon is as large as the text around it (`1em`). */
  readonly size = input<UiIconSize>();

  private readonly _svg = computed(() => UI_ICONS[this.name()]);
  private readonly _size = computed(() => {
    const size = this.size();
    return size ? SIZES[size] : '1em';
  });
}
