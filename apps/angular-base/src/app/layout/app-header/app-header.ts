import { Component, model } from '@angular/core';
import { LanguageToggle } from '@core/i18n/language-toggle/language-toggle';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { ThemeToggle } from '@core/theme/theme-toggle/theme-toggle';
import { AccountMenu } from '@features/auth/public-api';
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
}
