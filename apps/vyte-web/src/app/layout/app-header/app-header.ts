import { Component, model } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { AccountMenu } from '@features/auth/public-api';
import { LanguageToggle } from '@shared/language-toggle/language-toggle';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiNavMenu } from '@shared/ui/nav-menu/nav-menu';
import { AppLogo } from '../app-logo/app-logo';
import { injectAppNavItems } from '../app-nav-items';

@Component({
  selector: 'app-header',
  imports: [AccountMenu, AppLogo, LanguageToggle, TranslatePipe, UiButton, UiIcon, UiNavMenu],
  styleUrl: './app-header.scss',
  templateUrl: './app-header.html',
})
export class AppHeader {
  /** Whether the mobile drawer is open. Set to `true` by the menu button. */
  readonly drawerOpen = model(false);

  private readonly _items = injectAppNavItems();
}
