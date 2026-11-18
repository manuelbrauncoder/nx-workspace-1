import { ViewportScroller } from '@angular/common';
import { Component, ElementRef, inject, model } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiNavMenu } from '@shared/ui/nav-menu/nav-menu';
import { AppLogo } from '../app-logo/app-logo';
import { APP_NAV_ITEMS } from '../app-nav-items';
import { AppSettingsMenu } from '../app-settings-menu/app-settings-menu';

@Component({
  selector: 'app-header',
  imports: [AppLogo, AppSettingsMenu, TranslatePipe, UiButton, UiIcon, UiNavMenu],
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
