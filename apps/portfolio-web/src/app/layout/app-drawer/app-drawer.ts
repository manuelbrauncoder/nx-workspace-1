import { ViewportScroller } from '@angular/common';
import { Component, DOCUMENT, inject, model } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { AccountMenu } from '@features/auth/public-api';
import { LanguageToggle } from '@shared/language-toggle/language-toggle';
import { ThemeToggle } from '@shared/theme-toggle/theme-toggle';
import { UiNavMenu } from '@shared/ui/nav-menu/nav-menu';
import { UiSheet } from '@shared/ui/sheet/sheet';
import { AppLogo } from '../app-logo/app-logo';
import { APP_NAV_ITEMS } from '../app-nav-items';

@Component({
  selector: 'app-drawer',
  imports: [AccountMenu, AppLogo, LanguageToggle, ThemeToggle, TranslatePipe, UiNavMenu, UiSheet],
  styleUrl: './app-drawer.scss',
  templateUrl: './app-drawer.html',
})
export class AppDrawer {
  readonly open = model(false);

  private readonly _items = APP_NAV_ITEMS;
  private readonly _scroller = inject(ViewportScroller);
  private readonly _document = inject(DOCUMENT);

  /** Section a link of the drawer pointed to, reached once the drawer is closed. */
  private _pendingSection: string | undefined;

  /** Closes the drawer when one of its links was activated. */
  private _closeOnLink(event: Event): void {
    const link = event.target instanceof Element ? event.target.closest('a') : null;
    if (!link) {
      return;
    }
    this._pendingSection = new URL(link.href).hash.slice(1) || undefined;
    this.open.set(false);
  }

  /**
   * The open drawer locks the page, so the router cannot scroll to the section of a fragment
   * link. Once the drawer is gone, this does it instead and moves focus there.
   */
  private _onClosed(): void {
    const section = this._pendingSection;
    this._pendingSection = undefined;
    if (section) {
      this._scroller.scrollToAnchor(section);
      this._document.getElementById(section)?.focus({ preventScroll: true });
    }
  }
}
