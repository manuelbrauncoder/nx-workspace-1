import { Component, computed, inject, input, Signal, signal } from '@angular/core';
import { isActive, IsActiveMatchOptions, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { TranslationKey } from '@core/i18n/translation-key';
import { HlmCollapsibleImports } from '@spartan-ng/helm/collapsible';
import { HlmNavigationMenuImports } from '@spartan-ng/helm/navigation-menu';
import { UiIcon } from '../icon/icon';

export interface UiNavMenuLink {
  labelKey: TranslationKey;
  /** Absolute route path. */
  path: string;
  /** Marks the link only on exactly this path, e.g. an overview above its sub pages. */
  exact?: boolean;
}

/** Entry without a page of its own, its links open below it. */
export interface UiNavMenuGroup {
  labelKey: TranslationKey;
  children: UiNavMenuLink[];
}

export type UiNavMenuItem = UiNavMenuLink | UiNavMenuGroup;

export type UiNavMenuOrientation = 'horizontal' | 'vertical';

interface LinkEntry {
  kind: 'link';
  link: UiNavMenuLink;
  /** Whether the link points to the current page. */
  active: Signal<boolean>;
}

interface GroupEntry {
  kind: 'group';
  group: UiNavMenuGroup;
  children: LinkEntry[];
  /** Whether one of the children points to the current page. */
  active: Signal<boolean>;
}

const SUBSET: IsActiveMatchOptions = {
  paths: 'subset',
  queryParams: 'ignored',
  matrixParams: 'ignored',
  fragment: 'ignored',
};
const EXACT: IsActiveMatchOptions = { ...SUBSET, paths: 'exact' };

/**
 * Navigation built from a list of items. An item with `children` becomes a group: a dropdown
 * that opens on click in the horizontal bar, a collapsible section in the vertical list. The
 * link of the current page is marked with `aria-current="page"`. Groups nest one level.
 *
 * @example
 * <!-- _items: UiNavMenuItem[] = [
 *   { labelKey: 'layout.nav.notes', path: '/notes' },
 *   {
 *     labelKey: 'layout.nav.showcase',
 *     children: [{ labelKey: 'layout.nav.showcaseForms', path: '/showcase/forms' }],
 *   },
 * ] -->
 * <app-ui-nav-menu [items]="_items" label="Hauptnavigation" />
 *
 * @example
 * <!-- Stacked, e.g. inside an app-ui-sheet -->
 * <app-ui-nav-menu [items]="_items" label="Hauptnavigation" orientation="vertical" />
 */
@Component({
  selector: 'app-ui-nav-menu',
  imports: [HlmCollapsibleImports, HlmNavigationMenuImports, RouterLink, TranslatePipe, UiIcon],
  styleUrl: './nav-menu.scss',
  templateUrl: './nav-menu.html',
})
export class UiNavMenu {
  readonly items = input.required<UiNavMenuItem[]>();
  /** Accessible name of the `<nav>` landmark. */
  readonly label = input.required<string>();
  /** `vertical` stacks the items and shows groups as collapsible sections instead of dropdowns. */
  readonly orientation = input<UiNavMenuOrientation>('horizontal');

  private readonly _router = inject(Router);

  /** Id of the group whose dropdown is open. */
  private readonly _openItem = signal<string | undefined>(undefined);

  private readonly _entries = computed(() =>
    this.items().map((item): LinkEntry | GroupEntry => {
      if (!('children' in item)) {
        return this._linkEntry(item);
      }
      const children = item.children.map((child) => this._linkEntry(child));
      return {
        kind: 'group',
        group: item,
        children,
        active: computed(() => children.some((child) => child.active())),
      };
    }),
  );

  private _linkEntry(link: UiNavMenuLink): LinkEntry {
    return {
      kind: 'link',
      link,
      active: isActive(link.path, this._router, link.exact ? EXACT : SUBSET),
    };
  }
}
