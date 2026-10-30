import { ViewportScroller } from '@angular/common';
import { Component, ElementRef, inject, model } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { AccountMenu } from '@features/auth/public-api';
import { LanguageToggle } from '@shared/language-toggle/language-toggle';
import { ThemeToggle } from '@shared/theme-toggle/theme-toggle';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiNavMenu } from '@shared/ui/nav-menu/nav-menu';
import { AppLogo } from '../app-logo/app-logo';
import { APP_NAV_ITEMS } from '../app-nav-items';

@Component({
  selector: 'app-header',
  imports: [
    AccountMenu,
    AppLogo,
    LanguageToggle,
    ThemeToggle,
    TranslatePipe,
    UiButton,
    UiIcon,
    UiNavMenu,
  ],
  styleUrl: './app-header.scss',
  templateUrl: './app-header.html',
})
export class AppHeader {
  /** Whether the mobile drawer is open. Set to `true` by the menu button. */
  readonly drawerOpen = model(false);

  private readonly _items = APP_NAV_ITEMS;

  constructor() {
    // The header sticks to the top, so a jump to a section stops below it instead of behind it.
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    inject(ViewportScroller).setOffset(() => [0, host.offsetHeight]);
  }
}
