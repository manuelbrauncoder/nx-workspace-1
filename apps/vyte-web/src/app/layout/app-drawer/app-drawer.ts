import { Component, model } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiNavMenu } from '@shared/ui/nav-menu/nav-menu';
import { UiSheet } from '@shared/ui/sheet/sheet';
import { AppLogo } from '../app-logo/app-logo';
import { APP_NAV_ITEMS } from '../app-nav-items';

@Component({
  selector: 'app-drawer',
  imports: [TranslatePipe, AppLogo, UiNavMenu, UiSheet],
  styleUrl: './app-drawer.scss',
  templateUrl: './app-drawer.html',
})
export class AppDrawer {
  readonly open = model(false);

  private readonly _items = APP_NAV_ITEMS;
}
