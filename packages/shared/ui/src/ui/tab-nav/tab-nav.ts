import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { TranslationKey } from '@core/i18n/translation-key';

export interface UiTabNavItem {
  labelKey: TranslationKey;
  /** Absolute route path. */
  path: string;
  /** Marks the tab only on exactly this path, e.g. the overview above the other tabs. */
  exact?: boolean;
}

/**
 * Tabs between the pages of one thing, e.g. the overview, guests and team of an event. Each tab
 * is a link, the current one carries `aria-current="page"` and an ink line. On a phone the row
 * scrolls sideways instead of wrapping.
 *
 * @example
 * <app-ui-tab-nav [items]="_tabs()" label="Bereiche des Events" />
 */
@Component({
  selector: 'app-ui-tab-nav',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  styleUrl: './tab-nav.scss',
  templateUrl: './tab-nav.html',
})
export class UiTabNav {
  readonly items = input.required<readonly UiTabNavItem[]>();
  /** Name of the navigation, e.g. what the tabs belong to. */
  readonly label = input.required<string>();
}
