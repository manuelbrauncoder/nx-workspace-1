import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiIcon } from '@shared/ui/icon/icon';
import { AppLogo } from '../app-logo/app-logo';
import { APP_FOOTER_ITEMS } from '../app-nav-items';

@Component({
  selector: 'app-footer',
  imports: [AppLogo, RouterLink, RouterLinkActive, TranslatePipe, UiIcon],
  styleUrl: './app-footer.scss',
  templateUrl: './app-footer.html',
})
export class AppFooter {
  private readonly _items = APP_FOOTER_ITEMS;
}
